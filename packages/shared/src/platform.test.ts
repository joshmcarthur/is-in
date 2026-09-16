import { describe, expect, it } from "vitest";
import { parsePlatformStats, platformStatsKey } from "./platform.js";

describe("platformStatsKey", () => {
  it("returns stable key", () => {
    expect(platformStatsKey()).toBe("platform:stats");
  });
});

describe("parsePlatformStats", () => {
  it("parses valid stats", () => {
    expect(parsePlatformStats(JSON.stringify({ claimedSites: 3 }))).toEqual({
      claimedSites: 3,
    });
  });

  it("rejects invalid payloads", () => {
    expect(parsePlatformStats(null)).toBeNull();
    expect(parsePlatformStats("{}")).toBeNull();
    expect(parsePlatformStats('{"claimedSites":-1}')).toBeNull();
  });
});
