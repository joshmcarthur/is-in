/** Subdomains reserved for platform use (see ADR-0003). */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "home",
  "api",
  "mail",
  "smtp",
  "ftp",
  "admin",
  "root",
  "is-in",
  "staging",
  "dev",
  "test",
  "_dmarc",
  "status",
  "ns1",
  "ns2",
  "mx",
  "imap",
  "pop",
  "webmail",
]);

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

/** Lowercase email; minimal normalisation (full IDNA left to clients / later). */
export function canonicalEmail(email: string): string {
  const t = email.trim();
  const at = t.lastIndexOf("@");
  if (at <= 0) return t.toLowerCase();
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  return `${local.toLowerCase()}@${domain.toLowerCase()}`;
}

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidSubdomain(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length < 1 || s.length > 63) return false;
  if (!SUBDOMAIN_RE.test(s)) return false;
  if (RESERVED_SUBDOMAINS.has(s)) return false;
  return true;
}

export type SiteRecord = {
  ownerEmail: string;
  webForwardUrl: string | null;
  emailForwardDest: string | null;
  createdAt: string;
};

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
