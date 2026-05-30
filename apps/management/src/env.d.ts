/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE?: string;
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
