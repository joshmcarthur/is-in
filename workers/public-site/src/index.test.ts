import { reset } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { CATCH_ALL_KEY, createEmptySiteRecord, type SiteRecord, siteKey } from "@is-in/shared";
import { afterEach, describe, expect, it } from "vitest";

const siteRecord = (url: string | null): SiteRecord => ({
  ...createEmptySiteRecord("owner@example.com", "2025-01-01T00:00:00.000Z"),
  ...(url ? { webForwards: { [CATCH_ALL_KEY]: { url } } } : {}),
});

describe("public-site worker", () => {
  afterEach(async () => {
    await reset();
  });

  it("redirects when catch-all web forward is set", async () => {
    await env.KV.put(siteKey("demo"), JSON.stringify(siteRecord("https://example.com/landing")));
    const res = await exports.default.fetch("https://demo.is-in.nz/", {
      headers: { Host: "demo.is-in.nz" },
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://example.com/landing");
  });

  it("prefers path-specific forward over catch-all", async () => {
    const record: SiteRecord = {
      ...createEmptySiteRecord("owner@example.com", "2025-01-01T00:00:00.000Z"),
      webForwards: {
        [CATCH_ALL_KEY]: { url: "https://example.com/home" },
        "go/event": { url: "https://example.com/event", status: 301 },
      },
    };
    await env.KV.put(siteKey("demo"), JSON.stringify(record));
    const res = await exports.default.fetch("https://demo.is-in.nz/go/event", {
      headers: { Host: "demo.is-in.nz" },
      redirect: "manual",
    });
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://example.com/event");
  });

  it("returns 404 for unknown subdomain", async () => {
    const res = await exports.default.fetch("https://missing.is-in.nz/", {
      headers: { Host: "missing.is-in.nz" },
    });
    expect(res.status).toBe(404);
  });
});
