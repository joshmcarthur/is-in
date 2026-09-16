import { wrapCloudflareKv } from "@is-in/shared";
import type { ManagementEnv } from "./env";

/** Map Cloudflare Worker bindings to the portable management env. */
export function toManagementEnv(cf: Cloudflare.Env): ManagementEnv {
  return {
    KV: wrapCloudflareKv(cf.KV),
    AI: cf.AI,
    EMAIL: cf.EMAIL,
    SESSION_SECRET: cf.SESSION_SECRET,
    ROOT_DOMAIN: cf.ROOT_DOMAIN,
    PRODUCT_NAME: cf.PRODUCT_NAME,
    MANAGEMENT_HOST: cf.MANAGEMENT_HOST,
    OTP_FROM: cf.OTP_FROM,
    OTP_SUBJECT: cf.OTP_SUBJECT,
    AUTH_MODE: cf.AUTH_MODE,
    OTP_ALLOWLIST: cf.OTP_ALLOWLIST,
    SUBDOMAIN_MODERATION: cf.SUBDOMAIN_MODERATION,
    SIGNUPS_ENABLED: cf.SIGNUPS_ENABLED,
    MAX_CLAIMED_SITES: cf.MAX_CLAIMED_SITES,
    MANAGEMENT_ENABLED: cf.MANAGEMENT_ENABLED,
    OTP_ENABLED: cf.OTP_ENABLED,
    WEB_CONFIG_ENABLED: cf.WEB_CONFIG_ENABLED,
    EMAIL_CONFIG_ENABLED: cf.EMAIL_CONFIG_ENABLED,
    OPERATOR_GRANTS: cf.OPERATOR_GRANTS,
    ASSETS: cf.ASSETS,
  };
}
