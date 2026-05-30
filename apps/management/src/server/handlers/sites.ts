import {
  canonicalEmail,
  isValidSubdomain,
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
  const site: SiteRecord = {
    ownerEmail: s.email,
    webForwardUrl: null,
    emailForwardDest: null,
    createdAt: now,
  };
  await env.KV.put(sk, JSON.stringify(site));

  const userRec: UserRecord = { sites: [subdomain] };
  await env.KV.put(uk, JSON.stringify(userRec));

  return json({ ok: true, site });
};

export const patchSiteForwarding: ControlPlaneHandler = async (request, env, segments) => {
  const s = await readSession(request, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  const segment = segments[2];
  if (!segment) return json({ error: "invalid_subdomain" }, 400);
  const subdomain = decodeURIComponent(segment).trim().toLowerCase();
  if (!isValidSubdomain(subdomain)) {
    return json({ error: "invalid_subdomain" }, 400);
  }
  const sk = siteKey(subdomain);
  const raw = await env.KV.get(sk);
  if (!raw) return json({ error: "not_found" }, 404);
  let site: SiteRecord;
  try {
    site = JSON.parse(raw) as SiteRecord;
  } catch {
    return json({ error: "not_found" }, 404);
  }
  if (canonicalEmail(site.ownerEmail) !== s.email) {
    return json({ error: "forbidden" }, 403);
  }

  let body: { webForwardUrl?: string | null; emailForwardDest?: string | null };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if ("webForwardUrl" in body) {
    if (body.webForwardUrl === null || body.webForwardUrl === "") {
      site.webForwardUrl = null;
    } else if (typeof body.webForwardUrl === "string" && isSafeForwardUrl(body.webForwardUrl)) {
      site.webForwardUrl = body.webForwardUrl.trim();
    } else {
      return json({ error: "invalid_web_forward_url" }, 400);
    }
  }
  if ("emailForwardDest" in body) {
    if (body.emailForwardDest === null || body.emailForwardDest === "") {
      site.emailForwardDest = null;
    } else if (
      typeof body.emailForwardDest === "string" &&
      isValidDestinationEmail(body.emailForwardDest)
    ) {
      site.emailForwardDest = canonicalEmail(body.emailForwardDest.trim());
    } else {
      return json({ error: "invalid_email_forward_dest" }, 400);
    }
  }

  await env.KV.put(sk, JSON.stringify(site));
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
