import { reset } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { type SiteRecord, siteKey } from "@is-in/shared";
import { afterEach, describe, expect, it } from "vitest";

const siteRecord = (webForwardUrl: string | null): SiteRecord => ({
  ownerEmail: "owner@example.com",
  webForwardUrl,
  emailForwardDest: null,
  createdAt: "2025-01-01T00:00:00.000Z",
});

describe("public-site worker", () => {
  afterEach(async () => {
    await reset();
  });

  it("redirects when webForwardUrl is set", async () => {
    await env.KV.put(siteKey("demo"), JSON.stringify(siteRecord("https://example.com/landing")));
    const res = await exports.default.fetch("https://demo.is-in.nz/", {
      headers: { Host: "demo.is-in.nz" },
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://example.com/landing");
  });

  it("returns 404 for unknown subdomain", async () => {
    const res = await exports.default.fetch("https://missing.is-in.nz/", {
      headers: { Host: "missing.is-in.nz" },
    });
    expect(res.status).toBe(404);
  });
});
