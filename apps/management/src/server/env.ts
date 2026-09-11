/** Cloudflare bindings + secrets available on `locals.runtime.env` (Pages Functions). */
import type { KvStore } from "@is-in/shared";

export interface ManagementEnv {
  KV: KvStore;
  AI: Ai;
  EMAIL?: SendEmail;
  SESSION_SECRET: string;
  OTP_FROM: string;
  OTP_SUBJECT: string;
  /** Set to `"off"` in local dev to skip Workers AI moderation. Never use in staging/production. */
  SUBDOMAIN_MODERATION?: string;
  ASSETS?: Fetcher;
}
