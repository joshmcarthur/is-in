import {
  CATCH_ALL_KEY,
  canonicalEmail,
  countEmailAliases,
  countWebLinks,
  createEmptySiteRecord,
  ensureForwardingMaps,
  isValidEmailLocalKey,
  isValidSubdomain,
  isValidWebPathKey,
  MAX_DESTINATIONS_PER_ALIAS,
  MAX_EMAIL_ALIASES,
  MAX_WEB_LINKS,
  normalizeEmailLocal,
  normalizeWebPath,
  type SiteRecord,
  siteKey,
  type UserRecord,
  userKey,
} from "@is-in/shared";
import { json } from "../http";
import { moderateSubdomain } from "../moderation/subdomain";
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
  const sk = siteKey(subdomain);
  const raw = await env.KV.get(sk);
  if (!raw) return { ok: false, response: json({ error: "not_found" }, 404) };
  let site: SiteRecord;
  try {
    site = JSON.parse(raw) as SiteRecord;
  } catch {
    return { ok: false, response: json({ error: "not_found" }, 404) };
  }
  if (canonicalEmail(site.ownerEmail) !== s.email) {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }
  ensureForwardingMaps(site);
  return { ok: true, site };
}

async function persistSite(
  env: Parameters<ControlPlaneHandler>[1],
  subdomain: string,
  site: SiteRecord,
) {
  site.version = 2;
  await env.KV.put(siteKey(subdomain), JSON.stringify(site));
}

export const getSitesMe: ControlPlaneHandler = async (request, env) => {
  const s = await readSession(request, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  const uk = userKey(s.email);
  const raw = await env.KV.get(uk);
  let sites: string[] = [];
  if (raw) {
    try {
      sites = (JSON.parse(raw) as UserRecord).sites ?? [];
    } catch {
      sites = [];
    }
  }
  const details: Array<SiteRecord & { subdomain: string }> = [];
  for (const sub of sites) {
    const sr = await env.KV.get(siteKey(sub));
    if (sr) {
      try {
        const parsed = JSON.parse(sr) as SiteRecord;
        ensureForwardingMaps(parsed);
        details.push({ ...parsed, subdomain: sub });
      } catch {
        /* skip */
      }
    }
  }
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

  const uk = userKey(s.email);
  const existingUser = await env.KV.get(uk);
  if (existingUser) {
    try {
      const u = JSON.parse(existingUser) as UserRecord;
      if (u.sites?.length >= 1) {
        return json({ error: "already_has_site" }, 409);
      }
    } catch {
      /* continue */
    }
  }

  const sk = siteKey(subdomain);
  const race = await env.KV.get(sk);
  if (race) {
    return json({ error: "taken" }, 409);
  }

  if (env.SUBDOMAIN_MODERATION !== "off") {
    if (!env.AI) return json({ error: "server_misconfigured" }, 500);
    const mod = await moderateSubdomain(env.AI, subdomain);
    if (!mod.ok && mod.reason === "policy") {
      return json({ error: "subdomain_not_allowed" }, 400);
    }
    if (!mod.ok) {
      return json({ error: "moderation_unavailable" }, 503);
    }
  }

  const now = new Date().toISOString();
  const site = createEmptySiteRecord(s.email, now);
  await env.KV.put(sk, JSON.stringify(site));

  const userRec: UserRecord = { sites: [subdomain] };
  await env.KV.put(uk, JSON.stringify(userRec));

  return json({ ok: true, site });
};

function setCatchAllWebForward(site: SiteRecord, url: string | null): Response | null {
  const { webForwards } = ensureForwardingMaps(site);
  if (url === null) {
    delete webForwards[CATCH_ALL_KEY];
    return null;
  }
  webForwards[CATCH_ALL_KEY] = { url };
  return null;
}

function setCatchAllEmailAlias(site: SiteRecord, dest: string | null): Response | null {
  const { emailAliases } = ensureForwardingMaps(site);
  if (dest === null) {
    delete emailAliases[CATCH_ALL_KEY];
    return null;
  }
  emailAliases[CATCH_ALL_KEY] = { destinations: [dest] };
  return null;
}

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
    if (body.webForwardUrl === null || body.webForwardUrl === "") {
      const err = setCatchAllWebForward(site, null);
      if (err) return err;
    } else if (typeof body.webForwardUrl === "string" && isSafeForwardUrl(body.webForwardUrl)) {
      const err = setCatchAllWebForward(site, body.webForwardUrl.trim());
      if (err) return err;
    } else {
      return json({ error: "invalid_web_forward_url" }, 400);
    }
  }
  if ("emailForwardDest" in body) {
    if (body.emailForwardDest === null || body.emailForwardDest === "") {
      const err = setCatchAllEmailAlias(site, null);
      if (err) return err;
    } else if (
      typeof body.emailForwardDest === "string" &&
      isValidDestinationEmail(body.emailForwardDest)
    ) {
      const err = setCatchAllEmailAlias(site, canonicalEmail(body.emailForwardDest.trim()));
      if (err) return err;
    } else {
      return json({ error: "invalid_email_forward_dest" }, 400);
    }
  }

  await persistSite(env, subdomain, site);
  return json({ ok: true, site });
};

export const postSiteLink: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;

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
  const { webForwards } = ensureForwardingMaps(site);
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

  const pathKey = normalizeWebPath(segments.slice(4).join("/"));
  if (!pathKey || pathKey === CATCH_ALL_KEY || !isValidWebPathKey(pathKey)) {
    return json({ error: "invalid_path" }, 400);
  }
  const { webForwards } = ensureForwardingMaps(site);
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

  const { emailAliases } = ensureForwardingMaps(site);
  const isNew = !(localKey in emailAliases);
  if (isNew && countEmailAliases(site) >= MAX_EMAIL_ALIASES) {
    return json({ error: "rule_limit_exceeded" }, 400);
  }

  emailAliases[localKey] = { destinations };
  await persistSite(env, subdomain, site);
  return json({ ok: true, local: localKey, alias: emailAliases[localKey], site });
};

export const deleteSiteAlias: ControlPlaneHandler = async (request, env, segments) => {
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  const loaded = await loadOwnedSite(request, env, subdomain);
  if (!loaded.ok) return loaded.response;
  const site = loaded.site;

  const localKey = normalizeEmailLocal(decodeURIComponent(segments[4] ?? ""));
  if (!localKey || localKey === CATCH_ALL_KEY || !isValidEmailLocalKey(localKey)) {
    return json({ error: "invalid_local" }, 400);
  }
  const { emailAliases } = ensureForwardingMaps(site);
  if (!(localKey in emailAliases)) {
    return json({ error: "not_found" }, 404);
  }
  delete emailAliases[localKey];
  await persistSite(env, subdomain, site);
  return json({ ok: true, site });
};

export function matchesPatchSiteForwarding(segments: string[]): boolean {
  return (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "sites" &&
    segments[3] === "forwarding"
  );
}

export function matchesPostSiteLink(segments: string[]): boolean {
  return (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "sites" &&
    segments[3] === "links"
  );
}

export function matchesDeleteSiteLink(segments: string[]): boolean {
  return (
    segments.length >= 5 &&
    segments[0] === "v1" &&
    segments[1] === "sites" &&
    segments[3] === "links"
  );
}

export function matchesPostSiteAlias(segments: string[]): boolean {
  return (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "sites" &&
    segments[3] === "aliases"
  );
}

export function matchesDeleteSiteAlias(segments: string[]): boolean {
  return (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "sites" &&
    segments[3] === "aliases"
  );
}
