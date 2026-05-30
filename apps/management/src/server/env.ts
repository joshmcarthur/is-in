/** Cloudflare bindings + secrets available on `locals.runtime.env` (Pages Functions). */
export interface ManagementEnv {
  KV: KVNamespace;
  EMAIL?: SendEmail;
  SESSION_SECRET: string;
  OTP_FROM: string;
  OTP_SUBJECT: string;
  ASSETS?: Fetcher;
}
