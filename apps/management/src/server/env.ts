/** Cloudflare bindings + secrets available on `locals.runtime.env` (Pages Functions). */
export interface ManagementEnv {
  KV: KVNamespace;
  AI: Ai;
  EMAIL?: SendEmail;
  SESSION_SECRET: string;
  OTP_FROM: string;
  OTP_SUBJECT: string;
  /** Set to `"off"` in local dev to skip Workers AI moderation. Never use in staging/production. */
  SUBDOMAIN_MODERATION?: string;
  ASSETS?: Fetcher;
}
