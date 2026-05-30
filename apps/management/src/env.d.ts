/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        KV: KVNamespace;
        AI: Ai;
        EMAIL?: SendEmail;
        SESSION_SECRET: string;
        OTP_FROM: string;
        OTP_SUBJECT: string;
        SUBDOMAIN_MODERATION?: string;
        ASSETS?: Fetcher;
      };
      cf: IncomingRequestCfProperties | undefined;
      caches: CacheStorage;
      ctx: { waitUntil: (p: Promise<unknown>) => void };
    };
  }
}
