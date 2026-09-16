import {
  CATCH_ALL_KEY,
  canonicalEmail,
  createEmptySiteRecord,
  parsePlatformStats,
  platformStatsKey,
  type SiteRecord,
  siteKey,
  type UserRecord,
  userKey,
} from "@is-in/shared";
import { describe, expect, it } from "vitest";
import { callControlPlane, callControlPlaneJson } from "./testing/api.js";
import { OTHER_EMAIL, TEST_EMAIL, TEST_SUB, useControlPlaneTest } from "./testing/hooks.js";
import { createMockAi } from "./testing/mockAi.js";
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

  it("rejects claim when sign-ups are disabled", async () => {
    test.env.SIGNUPS_ENABLED = "false";
    test.env.MAX_CLAIMED_SITES = "150";
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "newsite" }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(503);
    expect(body).toEqual({ error: "signups_closed" });
  });

  it("rejects claim when at MAX_CLAIMED_SITES", async () => {
    test.env.MAX_CLAIMED_SITES = "1";
    await test.env.KV.put(platformStatsKey(), JSON.stringify({ claimedSites: 1 }));
    const sid = await signInViaOtp(test.env, OTHER_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "another" }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(503);
    expect(body).toEqual({ error: "signups_closed" });
  });

  it("increments platform stats on successful claim", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    await callControlPlane(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: TEST_SUB }),
      env: test.env,
      ...withSessionCookie(sid),
    });
    const raw = await test.env.KV.get(platformStatsKey());
    expect(parsePlatformStats(raw)?.claimedSites).toBe(1);
  });

  it("GET platform/capacity returns public capacity", async () => {
    test.env.MAX_CLAIMED_SITES = "150";
    await test.env.KV.put(platformStatsKey(), JSON.stringify({ claimedSites: 10 }));
    const { status, body } = await callControlPlaneJson<{
      signupsOpen: boolean;
      signupsDisabled: boolean;
      remaining: number;
    }>(["v1", "platform", "capacity"], {
      method: "GET",
      env: test.env,
    });
    expect(status).toBe(200);
    expect(body?.signupsOpen).toBe(true);
    expect(body?.signupsDisabled).toBe(false);
    expect(body?.remaining).toBe(140);
  });

  it("returns 409 when subdomain is taken", async () => {
    const site = createEmptySiteRecord("owner@example.com", new Date().toISOString());
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

  it("returns 400 when moderation rejects subdomain", async () => {
    const env = {
      ...test.env,
      AI: createMockAi({ allowed: false, reason: "brand impersonation" }),
    };
    const sid = await signInViaOtp(env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "paypal-support" }),
      env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(400);
    expect(body).toEqual({ error: "subdomain_not_allowed" });
  });

  it("returns 503 when moderation is unavailable", async () => {
    const env = { ...test.env, AI: createMockAi("throw") };
    const sid = await signInViaOtp(env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "newname" }),
      env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(503);
    expect(body).toEqual({ error: "moderation_unavailable" });
  });

  it("skips moderation when SUBDOMAIN_MODERATION is unset", async () => {
    const env = {
      ...test.env,
      SUBDOMAIN_MODERATION: undefined,
      AI: createMockAi({ allowed: false, reason: "brand impersonation" }),
    };
    const sid = await signInViaOtp(env, TEST_EMAIL);
    const { status, body } = await callControlPlaneJson<{ ok: boolean }>(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: "newname" }),
      env,
      ...withSessionCookie(sid),
    });
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
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
    expect(patchRes.body?.site.webForwards?.[CATCH_ALL_KEY]?.url).toBe("https://example.com/page");
    expect(patchRes.body?.site.emailAliases?.[CATCH_ALL_KEY]?.destinations).toEqual([
      "fwd@example.com",
    ]);

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
    expect(clearRes.body?.site.webForwards?.[CATCH_ALL_KEY]).toBeUndefined();
    expect(clearRes.body?.site.emailAliases?.[CATCH_ALL_KEY]).toBeUndefined();
  });

  it("POST and DELETE links manage path-specific web forwards", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    await callControlPlane(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: TEST_SUB }),
      env: test.env,
      ...withSessionCookie(sid),
    });

    const postRes = await callControlPlaneJson<{ ok: boolean; path: string; site: SiteRecord }>(
      ["v1", "sites", TEST_SUB, "links"],
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "go/event", url: "https://example.com/event", status: 301 }),
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(postRes.status).toBe(200);
    expect(postRes.body?.path).toBe("go/event");
    expect(postRes.body?.site.webForwards?.["go/event"]?.url).toBe("https://example.com/event");

    const delRes = await callControlPlaneJson<{ ok: boolean; site: SiteRecord }>(
      ["v1", "sites", TEST_SUB, "links", "go", "event"],
      {
        method: "DELETE",
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(delRes.status).toBe(200);
    expect(delRes.body?.site.webForwards?.["go/event"]).toBeUndefined();
  });

  it("POST and DELETE aliases manage local-specific email forwards", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    await callControlPlane(["v1", "sites", "claim"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: TEST_SUB }),
      env: test.env,
      ...withSessionCookie(sid),
    });

    const postRes = await callControlPlaneJson<{ ok: boolean; local: string; site: SiteRecord }>(
      ["v1", "sites", TEST_SUB, "aliases"],
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ local: "jobs", destinations: ["jobs@example.com"] }),
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(postRes.status).toBe(200);
    expect(postRes.body?.local).toBe("jobs");
    expect(postRes.body?.site.emailAliases?.jobs?.destinations).toEqual(["jobs@example.com"]);

    const delRes = await callControlPlaneJson<{ ok: boolean; site: SiteRecord }>(
      ["v1", "sites", TEST_SUB, "aliases", "jobs"],
      {
        method: "DELETE",
        env: test.env,
        ...withSessionCookie(sid),
      },
    );
    expect(delRes.status).toBe(200);
    expect(delRes.body?.site.emailAliases?.jobs).toBeUndefined();
  });

  it("PATCH forwarding returns 403 for non-owner", async () => {
    const site = createEmptySiteRecord(canonicalEmail(OTHER_EMAIL), new Date().toISOString());
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
