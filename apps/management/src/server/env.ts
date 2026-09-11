/** Cloudflare bindings + secrets available on `locals.runtime.env` (Pages Functions). */
import type { KvStore } from "@is-in/shared";

export interface ManagementEnv {
  KV: KvStore;
  AI?: Ai;
  EMAIL?: SendEmail;
  SESSION_SECRET: string;
  ROOT_DOMAIN: string;
  PRODUCT_NAME?: string;
  MANAGEMENT_HOST?: string;
  OTP_FROM: string;
  OTP_SUBJECT: string;
  AUTH_MODE?: string;
  OTP_ALLOWLIST?: string;
  /** Set to `"on"` to enable Workers AI subdomain moderation. Default off for forks. */
  SUBDOMAIN_MODERATION?: string;
  ASSETS?: Fetcher;
}
