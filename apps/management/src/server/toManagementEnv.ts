import { wrapCloudflareKv } from "@is-in/shared";
import type { ManagementEnv } from "./env";

/** Map Cloudflare Worker bindings to the portable management env. */
export function toManagementEnv(cf: Cloudflare.Env): ManagementEnv {
  return {
    KV: wrapCloudflareKv(cf.KV),
    AI: cf.AI,
    EMAIL: cf.EMAIL,
    SESSION_SECRET: cf.SESSION_SECRET,
    OTP_FROM: cf.OTP_FROM,
    OTP_SUBJECT: cf.OTP_SUBJECT,
    SUBDOMAIN_MODERATION: cf.SUBDOMAIN_MODERATION,
    ASSETS: cf.ASSETS,
  };
}
