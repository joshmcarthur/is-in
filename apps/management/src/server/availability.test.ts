import { createEmptySiteRecord, siteKey } from "@is-in/shared";
import { describe, expect, it } from "vitest";
import { callControlPlaneJson } from "./testing/api.js";
import { TEST_SUB, useControlPlaneTest } from "./testing/hooks.js";

describe("availability", () => {
  const test = useControlPlaneTest();

  it("rejects invalid subdomains", async () => {
    const { status, body } = await callControlPlaneJson(["v1", "availability"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "www" }),
      env: test.env,
    });
    expect(status).toBe(200);
    expect(body).toEqual({ available: false, reason: "invalid_or_reserved" });
  });

  it("reports available when subdomain is unused", async () => {
    const { body } = await callControlPlaneJson<{ available: boolean; subdomain: string }>(
      ["v1", "availability"],
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdomain: TEST_SUB }),
        env: test.env,
      },
    );
    expect(body).toEqual({ available: true, subdomain: TEST_SUB });
  });

  it("reports unavailable when site exists in KV", async () => {
    const site = createEmptySiteRecord("owner@example.com", new Date().toISOString());
    await test.env.KV.put(siteKey(TEST_SUB), JSON.stringify(site));
    const { body } = await callControlPlaneJson<{ available: boolean }>(["v1", "availability"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: TEST_SUB }),
      env: test.env,
    });
    expect(body?.available).toBe(false);
  });
});
