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
  SIGNUPS_ENABLED?: string;
  MAX_CLAIMED_SITES?: string;
  /** Kill switches — default enabled when unset. */
  MANAGEMENT_ENABLED?: string;
  OTP_ENABLED?: string;
  WEB_CONFIG_ENABLED?: string;
  EMAIL_CONFIG_ENABLED?: string;
  /** `email:grant1,grant2;other@example.com:all` */
  OPERATOR_GRANTS?: string;
  ASSETS?: Fetcher;
}
