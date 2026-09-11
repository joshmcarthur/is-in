/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE?: string;
  /** Site suffix for UI copy, e.g. `is-in.nz` or `test.is-in.nz`. */
  readonly PUBLIC_ROOT_DOMAIN?: string;
  /** Product name for titles and copy; defaults to PUBLIC_ROOT_DOMAIN. */
  readonly PUBLIC_PRODUCT_NAME?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace Cloudflare {
  interface Env {
    KV: KVNamespace;
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
    /** Set to `"on"` to enable Workers AI subdomain moderation. */
    SUBDOMAIN_MODERATION?: string;
    ASSETS?: Fetcher;
  }
}
