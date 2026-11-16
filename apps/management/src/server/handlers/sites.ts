import {
  CATCH_ALL_KEY,
  canonicalEmail,
  countEmailAliases,
  countWebLinks,
  createEmptySiteRecord,
  isValidEmailLocalKey,
  isValidSubdomain,
  isValidWebPathKey,
  MAX_DESTINATIONS_PER_ALIAS,
  MAX_EMAIL_ALIASES,
  MAX_WEB_LINKS,
  normalizeEmailLocal,
  normalizeWebPath,
  parseSiteRecord,
  referencedDestinations,
  type SiteRecord,
  siteKey,
  type UserRecord,
  userKey,
} from "@is-in/shared";
import {
  pendingDestinations,
  pruneConfirmations,
  sendDestinationConfirmations,
  verifyDestinationToken,
} from "../destinations";
import { assertFeatureAccess } from "../featureAccess";
import { json } from "../http";
import { moderateSubdomain } from "../moderation/subdomain";
import { productName } from "../operatorConfig";
import {
  incrementClaimedSiteCount,
  readClaimedSiteCount,
  signupsAcceptingClaims,
} from "../platformCapacity";
import { readSession } from "../session";
import { isSafeForwardUrl, isValidDestinationEmail } from "../validate";
import type { ControlPlaneHandler } from "./types";

async function loadOwnedSite(
  request: Request,
  env: Parameters<ControlPlaneHandler>[1],
  subdomain: string,
): Promise<{ ok: true; site: SiteRecord } | { ok: false; response: Response }> {
  const s = await readSession(request, env);
  if (!s) return { ok: false, response: json({ error: "unauthorized" }, 401) };
  if (!isValidSubdomain(subdomain)) {
    return { ok: false, response: json({ error: "invalid_subdomain" }, 400) };
  }
  const store = env.KV;
  const raw = await store.get(siteKey(subdomain));
  if (!raw) return { ok: false, response: json({ error: "not_found" }, 404) };
  const site = parseSiteRecord(raw);
  if (!site) return { ok: false, response: json({ error: "not_found" }, 404) };
  if (canonicalEmail(site.ownerEmail) !== s.email) {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }
  return { ok: true, site };
}

async function persistSite(
  env: Parameters<ControlPlaneHandler>[1],
  subdomain: string,
  site: SiteRecord,
) {
  site.version = 2;
  pruneConfirmations(site);
  await env.KV.put(siteKey(subdomain), JSON.stringify(site));
}

function mergeUserSites(existing: UserRecord | null, subdomain: string): UserRecord {
  const sites = existing?.sites ?? [];
  if (sites.includes(subdomain)) {
    return { sites };
  }
  return { sites: [...sites, subdomain] };
}

export const getSitesMe: ControlPlaneHandler = async (request, env) => {
  const s = await readSession(request, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  const store = env.KV;
  const raw = await store.get(userKey(s.email));
  let sites: string[] = [];
  if (raw) {
    try {
      sites = (JSON.parse(raw) as UserRecord).sites ?? [];
    } catch {
      sites = [];
    }
  }
  const loaded = await Promise.all(
    sites.map(async (sub) => {
      const sr = await store.get(siteKey(sub));
      if (!sr) return null;
      const parsed = parseSiteRecord(sr);
      if (!parsed) return null;
      return { ...parsed, subdomain: sub };
    }),
  );
  const details = loaded.filter(
    (entry): entry is SiteRecord & { subdomain: string } => entry !== null,
  );
  return json({ sites: details });
};

export const postSitesClaim: ControlPlaneHandler = async (request, env) => {
  const s = await readSession(request, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  let body: { subdomain?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const raw = typeof body.subdomain === "string" ? body.subdomain : "";
  const subdomain = raw.trim().toLowerCase();
  if (!isValidSubdomain(subdomain)) {
    return json({ error: "invalid_or_reserved_subdomain" }, 400);
  }

  const store = env.KV;
  const uk = userKey(s.email);
  const existingUserRaw = await store.get(uk);
  let existingUser: UserRecord | null = null;
  if (existingUserRaw) {
    try {
      existingUser = JSON.parse(existingUserRaw) as UserRecord;
      if (existingUser.sites?.length >= 1) {
        return json({ error: "already_has_site" }, 409);
      }
    } catch {
      existingUser = null;
    }
  }

  const sk = siteKey(subdomain);
  const race = await store.get(sk);
  if (race) {
    return json({ error: "taken" }, 409);
  }

  const claimedSites = await readClaimedSiteCount(store);
  if (!signupsAcceptingClaims(env, claimedSites, s.email)) {
    return json({ error: "signups_closed" }, 503);
  }

  if (env.SUBDOMAIN_MODERATION === "on") {
    if (!env.AI) return json({ error: "server_misconfigured" }, 500);
    const mod = await moderateSubdomain(env.AI, subdomain, productName(env));
    if (!mod.ok && mod.reason === "policy") {
      return json({ error: "subdomain_not_allowed" }, 400);
    }
    if (!mod.ok) {
      return json({ error: "moderation_unavailable" }, 503);
    }
  }

  const now = new Date().toISOString();
  const site = createEmptySiteRecord(s.email, now);
  await store.put(sk, JSON.stringify(site));

  const userRec = mergeUserSites(existingUser, subdomain);
  await store.put(uk, JSON.stringify(userRec));

  await incrementClaimedSiteCount(store);

  return json({ ok: true, site });
};

export const patchSiteForwarding: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;

  let body: { webForwardUrl?: string | null; emailForwardDest?: string | null };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if ("webForwardUrl" in body) {
    const blocked = assertFeatureAccess(env, "web_config", { email: loaded.site.ownerEmail });
    if (blocked) return blocked;
    if (body.webForwardUrl === null || body.webForwardUrl === "") {
      delete site.webForwards[CATCH_ALL_KEY];
    } else if (typeof body.webForwardUrl === "string" && isSafeForwardUrl(body.webForwardUrl)) {
      site.webForwards[CATCH_ALL_KEY] = { url: body.webForwardUrl.trim() };
    } else {
      return json({ error: "invalid_web_forward_url" }, 400);
    }
  }
  if ("emailForwardDest" in body) {
    const blocked = assertFeatureAccess(env, "email_config", { email: loaded.site.ownerEmail });
    if (blocked) return blocked;
    if (body.emailForwardDest === null || body.emailForwardDest === "") {
      delete site.emailAliases[CATCH_ALL_KEY];
    } else if (
      typeof body.emailForwardDest === "string" &&
      isValidDestinationEmail(body.emailForwardDest)
    ) {
      site.emailAliases[CATCH_ALL_KEY] = {
        destinations: [canonicalEmail(body.emailForwardDest.trim())],
      };
    } else {
      return json({ error: "invalid_email_forward_dest" }, 400);
    }
  }

  await persistSite(env, subdomain, site);
  if (typeof body.emailForwardDest === "string" && body.emailForwardDest) {
    await sendDestinationConfirmations(
      env,
      new URL(request.url).origin,
      subdomain,
      site,
      site.emailAliases[CATCH_ALL_KEY]?.destinations ?? [],
    );
  }
  return json({ ok: true, site, pendingDestinations: pendingDestinations(site) });
};

export const postSiteLink: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;
  const blocked = assertFeatureAccess(env, "web_config", { email: site.ownerEmail });
  if (blocked) return blocked;

  let body: {
    path?: string;
    url?: string;
    status?: number;
    expiresAt?: string | null;
    title?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const pathRaw = typeof body.path === "string" ? body.path : "";
  const pathKey = normalizeWebPath(pathRaw);
  if (!pathKey || pathKey === CATCH_ALL_KEY || !isValidWebPathKey(pathKey)) {
    return json({ error: "invalid_path" }, 400);
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!isSafeForwardUrl(url)) {
    return json({ error: "invalid_web_forward_url" }, 400);
  }
  const { webForwards } = site;
  const isNew = !(pathKey in webForwards);
  if (isNew && countWebLinks(site) >= MAX_WEB_LINKS) {
    return json({ error: "rule_limit_exceeded" }, 400);
  }

  const status = body.status === 301 || body.status === 302 ? body.status : undefined;
  webForwards[pathKey] = {
    url,
    ...(status ? { status } : {}),
    ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}),
    ...(typeof body.title === "string" && body.title.trim() ? { title: body.title.trim() } : {}),
  };

  await persistSite(env, subdomain, site);
  return json({ ok: true, path: pathKey, forward: webForwards[pathKey], site });
};

export const deleteSiteLink: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;
  const blocked = assertFeatureAccess(env, "web_config", { email: site.ownerEmail });
  if (blocked) return blocked;

  const pathKey = normalizeWebPath(segments.slice(4).join("/"));
  if (!pathKey || pathKey === CATCH_ALL_KEY || !isValidWebPathKey(pathKey)) {
    return json({ error: "invalid_path" }, 400);
  }
  const { webForwards } = site;
  if (!(pathKey in webForwards)) {
    return json({ error: "not_found" }, 404);
  }
  delete webForwards[pathKey];
  await persistSite(env, subdomain, site);
  return json({ ok: true, site });
};

export const postSiteAlias: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;
  const blocked = assertFeatureAccess(env, "email_config", { email: site.ownerEmail });
  if (blocked) return blocked;

  let body: { local?: string; destinations?: string[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const localKey = normalizeEmailLocal(typeof body.local === "string" ? body.local : "");
  if (!localKey || localKey === CATCH_ALL_KEY || !isValidEmailLocalKey(localKey)) {
    return json({ error: "invalid_local" }, 400);
  }
  if (!Array.isArray(body.destinations) || body.destinations.length === 0) {
    return json({ error: "invalid_destinations" }, 400);
  }
  if (body.destinations.length > MAX_DESTINATIONS_PER_ALIAS) {
    return json({ error: "rule_limit_exceeded" }, 400);
  }
  const destinations: string[] = [];
  for (const raw of body.destinations) {
    if (typeof raw !== "string" || !isValidDestinationEmail(raw)) {
      return json({ error: "invalid_email_forward_dest" }, 400);
    }
    destinations.push(canonicalEmail(raw.trim()));
  }

  const { emailAliases } = site;
  const isNew = !(localKey in emailAliases);
  if (isNew && countEmailAliases(site) >= MAX_EMAIL_ALIASES) {
    return json({ error: "rule_limit_exceeded" }, 400);
  }

  emailAliases[localKey] = { destinations };
  await persistSite(env, subdomain, site);
  await sendDestinationConfirmations(
    env,
    new URL(request.url).origin,
    subdomain,
    site,
    destinations,
  );
  return json({
    ok: true,
    local: localKey,
    alias: emailAliases[localKey],
    site,
    pendingDestinations: pendingDestinations(site),
  });
};

export const deleteSiteAlias: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;
  const blocked = assertFeatureAccess(env, "email_config", { email: site.ownerEmail });
  if (blocked) return blocked;

  const localKey = normalizeEmailLocal(decodeURIComponent(segments[4] ?? ""));
  if (!localKey || localKey === CATCH_ALL_KEY || !isValidEmailLocalKey(localKey)) {
    return json({ error: "invalid_local" }, 400);
  }
  const { emailAliases } = site;
  if (!(localKey in emailAliases)) {
    return json({ error: "not_found" }, 404);
  }
  delete emailAliases[localKey];
  await persistSite(env, subdomain, site);
  return json({ ok: true, site });
};

/** Public: the recipient of a confirmation email (not the site owner) confirms a destination. */
export const postDestinationConfirm: ControlPlaneHandler = async (request, env) => {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const verified =
    typeof body.token === "string"
      ? await verifyDestinationToken(env.SESSION_SECRET, body.token)
      : null;
  if (!verified) return json({ error: "invalid_token" }, 400);

  const { subdomain, email } = verified;
  const raw = await env.KV.get(siteKey(subdomain));
  const site = raw ? parseSiteRecord(raw) : null;
  if (!site || !referencedDestinations(site).has(email)) {
    return json({ error: "not_found" }, 404);
  }
  const blocked = assertFeatureAccess(env, "email_config", { email: site.ownerEmail });
  if (blocked) return blocked;

  site.confirmedDestinations = {
    ...site.confirmedDestinations,
    [email]: site.confirmedDestinations?.[email] ?? new Date().toISOString(),
  };
  await persistSite(env, subdomain, site);
  return json({ ok: true, site: `${subdomain}.${env.ROOT_DOMAIN}`, email });
};
