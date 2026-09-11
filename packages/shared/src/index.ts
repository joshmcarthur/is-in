import { canonicalEmail } from "./email.js";
import { RESERVED_SUBDOMAINS } from "./reserved.js";

export { canonicalEmail } from "./email.js";
export type { CloudflareKvBinding, KvPutOptions, KvStore } from "./kv-store.js";
export { createMemoryKv, wrapCloudflareKv } from "./kv-store.js";
export { parseSiteFromEmailAddress, parseSiteHost } from "./parse-site-host.js";
export { parseSiteRecord } from "./parse-site-record.js";
export { RESERVED_SUBDOMAINS } from "./reserved.js";

export function siteKey(subdomain: string): string {
  return `site:${subdomain.toLowerCase()}`;
}

export function userKey(email: string): string {
  return `user:${canonicalEmail(email)}`;
}

export function otpKey(email: string): string {
  return `otp:${canonicalEmail(email)}`;
}

export function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

/** Coarse rate-limit counters (see ADR-0003). `bucket` should be a hashed or opaque id. */
export function ratelimitKey(scope: string, bucket: string): string {
  return `ratelimit:${scope}:${bucket}`;
}

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidSubdomain(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length < 1 || s.length > 63) return false;
  if (!SUBDOMAIN_RE.test(s)) return false;
  if (RESERVED_SUBDOMAINS.has(s)) return false;
  return true;
}

export type {
  EmailAlias,
  SiteRecord,
  WebForward,
} from "./forwarding.js";
export {
  CATCH_ALL_KEY,
  countEmailAliases,
  countWebLinks,
  createEmptySiteRecord,
  ensureForwardingMaps,
  isReservedWebPath,
  isValidEmailLocalKey,
  isValidWebPathKey,
  MAX_DESTINATIONS_PER_ALIAS,
  MAX_EMAIL_ALIASES,
  MAX_WEB_LINKS,
  normalizeEmailLocal,
  normalizeWebPath,
  RESERVED_EMAIL_LOCALS,
  resolveEmailAlias,
  resolveWebForward,
} from "./forwarding.js";

export type UserRecord = {
  sites: string[];
};

export type OtpRecord = {
  hash: string;
  exp: number;
  attempts: number;
};

export type SessionRecord = {
  email: string;
  exp: number;
};
