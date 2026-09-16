import { describe, expect, it } from "vitest";
import type { ManagementEnv } from "./env.js";
import { assertFeatureAccess, canAccessFeature } from "./featureAccess.js";

function env(overrides: Partial<ManagementEnv> = {}): ManagementEnv {
  return {
    KV: {} as ManagementEnv["KV"],
    SESSION_SECRET: "test-secret",
    ROOT_DOMAIN: "is-in.nz",
    OTP_FROM: "noreply@is-in.nz",
    OTP_SUBJECT: "code",
    ...overrides,
  };
}

describe("canAccessFeature", () => {
  it("allows when flag is enabled", () => {
    expect(canAccessFeature(env({ OTP_ENABLED: "true" }), "otp")).toBe(true);
  });

  it("denies when flag is disabled without grant", () => {
    expect(canAccessFeature(env({ OTP_ENABLED: "false" }), "otp")).toBe(false);
  });

  it("allows grant bypass when flag is disabled", () => {
    const testEnv = env({
      OTP_ENABLED: "false",
      OPERATOR_GRANTS: "ops@example.com:otp",
    });
    expect(canAccessFeature(testEnv, "otp", { email: "ops@example.com" })).toBe(true);
    expect(canAccessFeature(testEnv, "otp", { email: "other@example.com" })).toBe(false);
  });

  it("expands all grant", () => {
    const testEnv = env({
      MANAGEMENT_ENABLED: "false",
      OPERATOR_GRANTS: "ops@example.com:all",
    });
    expect(canAccessFeature(testEnv, "management", { email: "ops@example.com" })).toBe(true);
    expect(canAccessFeature(testEnv, "web_config", { email: "ops@example.com" })).toBe(true);
  });
});

describe("assertFeatureAccess", () => {
  it("returns 503 with stable error code", async () => {
    const res = assertFeatureAccess(env({ WEB_CONFIG_ENABLED: "false" }), "web_config", {
      email: "user@example.com",
    });
    expect(res?.status).toBe(503);
    expect(await res?.json()).toEqual({ error: "web_config_disabled" });
  });
});
