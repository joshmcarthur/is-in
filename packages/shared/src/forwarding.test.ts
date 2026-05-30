import { describe, expect, it } from "vitest";
import {
  CATCH_ALL_KEY,
  createEmptySiteRecord,
  isValidEmailLocalKey,
  isValidWebPathKey,
  normalizeEmailLocal,
  normalizeWebPath,
  resolveEmailAlias,
  resolveWebForward,
  type SiteRecord,
} from "./forwarding.js";

describe("normalizeWebPath", () => {
  it("strips leading slash and lowercases", () => {
    expect(normalizeWebPath("/Go/Example")).toBe("go/example");
    expect(normalizeWebPath("go/example/")).toBe("go/example");
  });

  it("maps root to empty string", () => {
    expect(normalizeWebPath("/")).toBe("");
  });
});

describe("resolveWebForward", () => {
  const base: SiteRecord = createEmptySiteRecord("a@b.com", "2025-01-01T00:00:00.000Z");

  it("prefers exact path over catch-all", () => {
    const site: SiteRecord = {
      ...base,
      webForwards: {
        [CATCH_ALL_KEY]: { url: "https://home.example" },
        "go/event": { url: "https://event.example" },
      },
    };
    expect(resolveWebForward(site, "/go/event")?.url).toBe("https://event.example");
    expect(resolveWebForward(site, "/other")?.url).toBe("https://home.example");
  });

  it("returns null when no rule matches", () => {
    expect(resolveWebForward(base, "/any")).toBeNull();
  });

  it("ignores expired rules", () => {
    const site: SiteRecord = {
      ...base,
      webForwards: {
        "go/old": { url: "https://old.example", expiresAt: "2020-01-01T00:00:00.000Z" },
        [CATCH_ALL_KEY]: { url: "https://home.example" },
      },
    };
    expect(resolveWebForward(site, "/go/old")?.url).toBe("https://home.example");
  });
});

describe("resolveEmailAlias", () => {
  const base: SiteRecord = createEmptySiteRecord("a@b.com", "2025-01-01T00:00:00.000Z");

  it("prefers exact local over catch-all", () => {
    const site: SiteRecord = {
      ...base,
      emailAliases: {
        [CATCH_ALL_KEY]: { destinations: ["me@example.com"] },
        jobs: { destinations: ["jobs@example.com"] },
      },
    };
    expect(resolveEmailAlias(site, "jobs")?.destinations).toEqual(["jobs@example.com"]);
    expect(resolveEmailAlias(site, "other")?.destinations).toEqual(["me@example.com"]);
  });

  it("returns null when no alias matches", () => {
    expect(resolveEmailAlias(base, "anything")).toBeNull();
  });
});

describe("path and local validation", () => {
  it("rejects reserved web paths and email locals", () => {
    expect(isValidWebPathKey("api/foo")).toBe(false);
    expect(isValidWebPathKey("go/event")).toBe(true);
    expect(isValidEmailLocalKey("postmaster")).toBe(false);
    expect(isValidEmailLocalKey(normalizeEmailLocal("Jobs"))).toBe(true);
  });
});
