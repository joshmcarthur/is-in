import {
  hasOperatorGrant,
  type OperatorGrant,
  parseFeatureEnabled,
  parseOperatorGrants,
} from "@is-in/shared";
import type { ManagementEnv } from "./env";
import { json } from "./http";

export type Feature = "management" | "otp" | "signups" | "web_config" | "email_config";

const FEATURE_ENV_KEY: Record<Feature, keyof ManagementEnv> = {
  management: "MANAGEMENT_ENABLED",
  otp: "OTP_ENABLED",
  signups: "SIGNUPS_ENABLED",
  web_config: "WEB_CONFIG_ENABLED",
  email_config: "EMAIL_CONFIG_ENABLED",
};

const FEATURE_ERROR: Record<Feature, string> = {
  management: "management_disabled",
  otp: "auth_disabled",
  signups: "signups_closed",
  web_config: "web_config_disabled",
  email_config: "email_config_disabled",
};

function operatorGrants(env: ManagementEnv) {
  return parseOperatorGrants(env.OPERATOR_GRANTS);
}

export function canAccessFeature(
  env: ManagementEnv,
  feature: Feature,
  context?: { email?: string },
): boolean {
  const envKey = FEATURE_ENV_KEY[feature];
  const raw = env[envKey];
  if (parseFeatureEnabled(typeof raw === "string" ? raw : undefined)) {
    return true;
  }
  const email = context?.email;
  if (!email) return false;
  return hasOperatorGrant(operatorGrants(env), email, feature as OperatorGrant);
}

export function assertFeatureAccess(
  env: ManagementEnv,
  feature: Feature,
  context?: { email?: string },
): Response | null {
  if (canAccessFeature(env, feature, context)) return null;
  return json({ error: FEATURE_ERROR[feature] }, 503);
}

export function isManagementRouteExempt(pathname: string, method: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname === "/api/v1/platform/capacity" && method === "GET") return true;
  if (pathname === "/api/v1/platform/status" && method === "GET") return true;
  if (pathname === "/api/v1/session" && method === "DELETE") return true;
  return false;
}
