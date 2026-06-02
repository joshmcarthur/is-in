/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE?: string;
  /** Site suffix for UI copy, e.g. `is-in.nz` or `test.is-in.nz`. */
  readonly PUBLIC_ROOT_DOMAIN?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace Cloudflare {
  interface Env {
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
}
