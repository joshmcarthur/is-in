import { canonicalEmail, type SiteRecord, siteKey, type UserRecord, userKey } from "@is-in/shared";
import { describe, expect, it } from "vitest";
import { callControlPlane, callControlPlaneJson } from "./testing/api.js";
import { OTHER_EMAIL, TEST_EMAIL, TEST_SUB, useControlPlaneTest } from "./testing/hooks.js";
import { signInViaOtp, withSessionCookie } from "./testing/session.js";

describe("sites", () => {
  const test = useControlPlaneTest();

  it("GET sites/me without auth returns 401", async () => {
    const { status, body } = await callControlPlaneJson(["v1", "sites", "me"], {
      method: "GET",
      env: test.env,
    });
    expect(status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
  });

  it("claims a subdomain and lists it on sites/me", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson<{ ok: boolean; site: SiteRecord }>(
      ["v1", "sites", "claim"],
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subdomain: TEST_SUB }),
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    expect(body?.site.ownerEmail).toBe(canonicalEmail(TEST_EMAIL));

    const { body: me } = await callControlPlaneJson<{
      sites: Array<SiteRecord & { subdomain: string }>;
    }>(["v1", "sites", "me"], {
      method: "GET",
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(me?.sites).toHaveLength(1);
    expect(me?.sites[0]?.subdomain).toBe(TEST_SUB);
  });

  it("returns 409 when subdomain is taken", async () => {
    const site: SiteRecord = {
      ownerEmail: "owner@example.com",
      webForwardUrl: null,
      emailForwardDest: null,
      createdAt: new Date().toISOString(),
    };
    await test.env.KV.put(siteKey("taken"), JSON.stringify(site));
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "taken" }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(409);
    expect(body).toEqual({ error: "taken" });
  });

  it("returns 409 when user already has a site", async () => {
    const uk = userKey(TEST_EMAIL);
    const userRec: UserRecord = { sites: ["existing"] };
    await test.env.KV.put(uk, JSON.stringify(userRec));
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "newsub" }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(409);
    expect(body).toEqual({ error: "already_has_site" });
  });

  it("PATCH forwarding updates and clears fields", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    await callControlPlane(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: TEST_SUB }),
      env: test.env,
      ...withSessionCookie(sid),
    });

    const patchRes = await callControlPlaneJson<{ ok: boolean; site: SiteRecord }>(
      ["v1", "sites", TEST_SUB, "forwarding"],
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          webForwardUrl: "https://example.com/page",
          emailForwardDest: "fwd@example.com",
        }),
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(patchRes.status).toBe(200);
    expect(patchRes.body?.site.webForwardUrl).toBe("https://example.com/page");
    expect(patchRes.body?.site.emailForwardDest).toBe("fwd@example.com");

    const clearRes = await callControlPlaneJson<{ site: SiteRecord }>(
      ["v1", "sites", TEST_SUB, "forwarding"],
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ webForwardUrl: null, emailForwardDest: null }),
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(clearRes.body?.site.webForwardUrl).toBeNull();
    expect(clearRes.body?.site.emailForwardDest).toBeNull();
  });

  it("PATCH forwarding returns 403 for non-owner", async () => {
    const site: SiteRecord = {
      ownerEmail: canonicalEmail(OTHER_EMAIL),
      webForwardUrl: null,
      emailForwardDest: null,
      createdAt: new Date().toISOString(),
    };
    await test.env.KV.put(siteKey(TEST_SUB), JSON.stringify(site));
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", TEST_SUB, "forwarding"], {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ webForwardUrl: "https://evil.com" }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(403);
    expect(body).toEqual({ error: "forbidden" });
  });

  it("PATCH forwarding returns 404 for unknown subdomain", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "nosuch", "forwarding"], {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ webForwardUrl: "https://example.com" }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(404);
    expect(body).toEqual({ error: "not_found" });
  });
});
