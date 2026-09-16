import { describe, expect, it } from "vitest";
import {
  deriveSignupsState,
  hasOperatorGrant,
  parseFeatureEnabled,
  parseOperatorGrants,
} from "./featureFlags.js";

describe("parseFeatureEnabled", () => {
  it("defaults to enabled", () => {
    expect(parseFeatureEnabled(undefined)).toBe(true);
    expect(parseFeatureEnabled("true")).toBe(true);
  });

  it("parses disabled values", () => {
    expect(parseFeatureEnabled("false")).toBe(false);
    expect(parseFeatureEnabled("off")).toBe(false);
    expect(parseFeatureEnabled("0")).toBe(false);
  });
});

describe("parseOperatorGrants", () => {
  it("parses grant entries with canonical email", () => {
    const grants = parseOperatorGrants("Admin@Example.com:management,otp;other@example.com:all");
    expect(hasOperatorGrant(grants, "admin@example.com", "management")).toBe(true);
    expect(hasOperatorGrant(grants, "admin@example.com", "web_config")).toBe(false);
    expect(hasOperatorGrant(grants, "other@example.com", "email_config")).toBe(true);
  });

  it("returns empty map when unset", () => {
    expect(parseOperatorGrants(undefined).size).toBe(0);
  });

  it("ignores invalid grant names", () => {
    const grants = parseOperatorGrants("user@example.com:invalid,otp");
    expect(hasOperatorGrant(grants, "user@example.com", "otp")).toBe(true);
    expect(grants.get("user@example.com")?.has("invalid" as never)).toBe(false);
  });
});

describe("deriveSignupsState", () => {
  it("derives open, paused, and full", () => {
    expect(deriveSignupsState({ signupsOpen: true, signupsDisabled: false })).toBe("open");
    expect(deriveSignupsState({ signupsOpen: false, signupsDisabled: true })).toBe("paused");
    expect(deriveSignupsState({ signupsOpen: false, signupsDisabled: false })).toBe("full");
  });
});
