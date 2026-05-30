import { RESERVED_SUBDOMAINS } from "./reserved.js";

/** Catch-all key for web paths and email local parts. */
export const CATCH_ALL_KEY = "*";

export const MAX_WEB_LINKS = 100;
export const MAX_EMAIL_ALIASES = 25;
export const MAX_DESTINATIONS_PER_ALIAS = 3;

export const RESERVED_EMAIL_LOCALS = new Set([
  "*",
  "postmaster",
  "abuse",
  "mailer-daemon",
  "hostmaster",
  "webmaster",
]);

export type WebForward = {
  url: string;
  status?: 301 | 302;
  expiresAt?: string | null;
  title?: string;
};

export type EmailAlias = {
  destinations: string[];
};

export type SiteRecord = {
  ownerEmail: string;
  createdAt: string;
  version?: number;
  webForwards: Record<string, WebForward>;
  emailAliases: Record<string, EmailAlias>;
};

/** Normalise an HTTP path to a map key (no leading slash, collapsed slashes, lowercased). */
export function normalizeWebPath(raw: string): string {
  let p = raw.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p === "/" ? "" : p.slice(1).toLowerCase();
}

/** Normalise an email local part to a map key. */
export function normalizeEmailLocal(raw: string): string {
  return raw.trim().toLowerCase();
}

export function ensureForwardingMaps(site: SiteRecord): {
  webForwards: Record<string, WebForward>;
  emailAliases: Record<string, EmailAlias>;
} {
  if (!site.webForwards) site.webForwards = {};
  if (!site.emailAliases) site.emailAliases = {};
  return { webForwards: site.webForwards, emailAliases: site.emailAliases };
}

export function countWebLinks(site: SiteRecord): number {
  return Object.keys(site.webForwards ?? {}).length;
}

export function countEmailAliases(site: SiteRecord): number {
  return Object.keys(site.emailAliases ?? {}).length;
}

export function isReservedWebPath(pathKey: string): boolean {
  if (!pathKey) return false;
  const first = pathKey.split("/")[0] ?? pathKey;
  return RESERVED_SUBDOMAINS.has(first) || RESERVED_SUBDOMAINS.has(pathKey);
}

export function isValidWebPathKey(pathKey: string): boolean {
  if (pathKey === CATCH_ALL_KEY) return true;
  if (!pathKey || pathKey.length > 512) return false;
  if (pathKey.includes("..")) return false;
  if (isReservedWebPath(pathKey)) return false;
  return true;
}

export function isValidEmailLocalKey(localKey: string): boolean {
  if (localKey === CATCH_ALL_KEY) return true;
  if (!localKey || localKey.length > 64) return false;
  if (RESERVED_EMAIL_LOCALS.has(localKey)) return false;
  if (!/^[a-z0-9][a-z0-9._+-]*[a-z0-9]$|^[a-z0-9]$/.test(localKey)) return false;
  return true;
}

function isExpired(forward: WebForward): boolean {
  if (!forward.expiresAt) return false;
  const exp = Date.parse(forward.expiresAt);
  return Number.isFinite(exp) && exp <= Date.now();
}

/** Resolve a web forward: exact path, then catch-all. */
export function resolveWebForward(site: SiteRecord, path: string): WebForward | null {
  const maps = site.webForwards ?? {};
  const key = normalizeWebPath(path);
  const candidates = [maps[key], maps[CATCH_ALL_KEY]].filter(Boolean) as WebForward[];
  for (const rule of candidates) {
    if (!isExpired(rule)) return rule;
  }
  return null;
}

/** Resolve an email alias: exact local, then catch-all. */
export function resolveEmailAlias(site: SiteRecord, localPart: string): EmailAlias | null {
  const maps = site.emailAliases ?? {};
  const key = normalizeEmailLocal(localPart);
  const exact = maps[key] ?? maps[CATCH_ALL_KEY];
  if (exact?.destinations.length) return exact;
  return null;
}

export function createEmptySiteRecord(ownerEmail: string, createdAt: string): SiteRecord {
  return {
    ownerEmail,
    createdAt,
    version: 2,
    webForwards: {},
    emailAliases: {},
  };
}
