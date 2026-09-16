import { createMemoryKv } from "@is-in/shared";
import { describe, expect, it } from "vitest";
import {
  getPublicCapacity,
  incrementClaimedSiteCount,
  parseMaxClaimedSites,
  parseSignupsEnabled,
  readClaimedSiteCount,
  signupsAcceptingClaims,
} from "./platformCapacity.js";

describe("parseSignupsEnabled", () => {
  it("defaults to enabled", () => {
    expect(parseSignupsEnabled(undefined)).toBe(true);
    expect(parseSignupsEnabled("true")).toBe(true);
    expect(parseSignupsEnabled("on")).toBe(true);
  });

  it("parses disabled values", () => {
    expect(parseSignupsEnabled("false")).toBe(false);
    expect(parseSignupsEnabled("off")).toBe(false);
    expect(parseSignupsEnabled("0")).toBe(false);
  });
});

describe("parseMaxClaimedSites", () => {
  it("parses positive integers", () => {
    expect(parseMaxClaimedSites("150")).toBe(150);
  });

  it("returns null when unset or invalid", () => {
    expect(parseMaxClaimedSites(undefined)).toBeNull();
    expect(parseMaxClaimedSites("")).toBeNull();
    expect(parseMaxClaimedSites("0")).toBeNull();
    expect(parseMaxClaimedSites("abc")).toBeNull();
  });
});

describe("signupsAcceptingClaims", () => {
  it("allows claims when enabled and under cap", () => {
    expect(signupsAcceptingClaims({ SIGNUPS_ENABLED: "true", MAX_CLAIMED_SITES: "150" }, 0)).toBe(
      true,
    );
    expect(signupsAcceptingClaims({ SIGNUPS_ENABLED: "true", MAX_CLAIMED_SITES: "150" }, 149)).toBe(
      true,
    );
  });

  it("rejects when sign-ups are disabled", () => {
    expect(signupsAcceptingClaims({ SIGNUPS_ENABLED: "false", MAX_CLAIMED_SITES: "150" }, 0)).toBe(
      false,
    );
  });

  it("rejects when at cap", () => {
    expect(signupsAcceptingClaims({ SIGNUPS_ENABLED: "true", MAX_CLAIMED_SITES: "150" }, 150)).toBe(
      false,
    );
  });

  it("allows unlimited claims when cap is unset", () => {
    expect(signupsAcceptingClaims({ SIGNUPS_ENABLED: "true" }, 999)).toBe(true);
  });
});

describe("readClaimedSiteCount and incrementClaimedSiteCount", () => {
  it("starts at zero and increments", async () => {
    const kv = createMemoryKv();
    expect(await readClaimedSiteCount(kv)).toBe(0);
    expect(await incrementClaimedSiteCount(kv)).toBe(1);
    expect(await readClaimedSiteCount(kv)).toBe(1);
  });
});

describe("getPublicCapacity", () => {
  it("returns open capacity with remaining", async () => {
    const kv = createMemoryKv();
    await incrementClaimedSiteCount(kv);
    const cap = await getPublicCapacity({ SIGNUPS_ENABLED: "true", MAX_CLAIMED_SITES: "150" }, kv);
    expect(cap).toEqual({
      signupsOpen: true,
      signupsDisabled: false,
      maxClaimedSites: 150,
      claimedSites: 1,
      remaining: 149,
    });
  });

  it("returns disabled state", async () => {
    const kv = createMemoryKv();
    const cap = await getPublicCapacity({ SIGNUPS_ENABLED: "false", MAX_CLAIMED_SITES: "150" }, kv);
    expect(cap.signupsOpen).toBe(false);
    expect(cap.signupsDisabled).toBe(true);
  });

  it("returns full cohort state", async () => {
    const kv = createMemoryKv();
    for (let i = 0; i < 2; i++) {
      await incrementClaimedSiteCount(kv);
    }
    const cap = await getPublicCapacity({ SIGNUPS_ENABLED: "true", MAX_CLAIMED_SITES: "2" }, kv);
    expect(cap.signupsOpen).toBe(false);
    expect(cap.signupsDisabled).toBe(false);
    expect(cap.remaining).toBe(0);
  });
});
