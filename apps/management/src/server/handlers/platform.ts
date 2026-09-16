import { parseFeatureEnabled } from "@is-in/shared";
import { json } from "../http";
import { getPublicCapacity } from "../platformCapacity";
import type { ControlPlaneHandler } from "./types";

export const getPlatformCapacity: ControlPlaneHandler = async (_request, env) => {
  const capacity = await getPublicCapacity(env, env.KV);
  return json(capacity);
};

export const getPlatformStatus: ControlPlaneHandler = async (_request, env) => {
  const capacity = await getPublicCapacity(env, env.KV);
  return json({
    managementEnabled: parseFeatureEnabled(env.MANAGEMENT_ENABLED),
    otpEnabled: parseFeatureEnabled(env.OTP_ENABLED),
    signupsState: capacity.signupsState,
    remaining: capacity.remaining,
    webConfigEnabled: parseFeatureEnabled(env.WEB_CONFIG_ENABLED),
    emailConfigEnabled: parseFeatureEnabled(env.EMAIL_CONFIG_ENABLED),
  });
};
