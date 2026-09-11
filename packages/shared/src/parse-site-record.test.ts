import { describe, expect, it } from "vitest";
import { createEmptySiteRecord } from "./forwarding.js";
import { parseSiteRecord } from "./parse-site-record.js";

describe("parseSiteRecord", () => {
  it("parses a v2 site with empty maps", () => {
    const site = createEmptySiteRecord("Owner@Example.com", "2026-01-01T00:00:00.000Z");
    const parsed = parseSiteRecord(JSON.stringify(site));
    expect(parsed).toEqual({
      ...site,
      ownerEmail: "owner@example.com",
    });
    expect(parsed?.ownerEmail).toBe("owner@example.com");
  });

  it("parses catch-all forwarding maps", () => {
    const raw = JSON.stringify({
      ownerEmail: "a@b.co",
      createdAt: "2026-01-01T00:00:00.000Z",
      version: 2,
      webForwards: { "*": { url: "https://example.com" } },
      emailAliases: { "*": { destinations: ["fwd@example.com"] } },
    });
    const parsed = parseSiteRecord(raw);
    expect(parsed?.webForwards["*"]?.url).toBe("https://example.com");
    expect(parsed?.emailAliases["*"]?.destinations).toEqual(["fwd@example.com"]);
  });

  it("rejects malformed JSON", () => {
    expect(parseSiteRecord("{")).toBeNull();
  });

  it("rejects missing maps", () => {
    expect(
      parseSiteRecord(
        JSON.stringify({
          ownerEmail: "a@b.co",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBeNull();
  });

  it("rejects invalid web forward entries", () => {
    expect(
      parseSiteRecord(
        JSON.stringify({
          ownerEmail: "a@b.co",
          createdAt: "2026-01-01T00:00:00.000Z",
          webForwards: { go: { url: "" } },
          emailAliases: {},
        }),
      ),
    ).toBeNull();
  });
});
