import { canonicalEmail, sessionKey } from "@is-in/shared";
import { describe, expect, it } from "vitest";
import { callControlPlane, callControlPlaneJson } from "./testing/api.js";
import { TEST_EMAIL, useControlPlaneTest } from "./testing/hooks.js";
import { signInViaOtp, withSessionCookie } from "./testing/session.js";

describe("session", () => {
  const test = useControlPlaneTest();

  it("GET session/me without cookie returns unauthenticated", async () => {
    const { body } = await callControlPlaneJson(["v1", "session", "me"], {
      method: "GET",
      env: test.env,
    });
    expect(body).toEqual({ authenticated: false });
  });

  it("GET session/me returns authenticated after sign-in", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    const { body } = await callControlPlaneJson<{
      authenticated: boolean;
      email?: string;
    }>(["v1", "session", "me"], {
      method: "GET",
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(body).toEqual({ authenticated: true, email: canonicalEmail(TEST_EMAIL) });
  });

  it("DELETE session clears cookie and KV session", async () => {
    const sid = await signInViaOtp(test.env, TEST_EMAIL);
    expect(await test.env.KV.get(sessionKey(sid))).not.toBeNull();

    const delRes = await callControlPlane(["v1", "session"], {
      method: "DELETE",
      env: test.env,
      ...withSessionCookie(sid),
    });
    expect(delRes?.status).toBe(200);
    expect(delRes?.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await test.env.KV.get(sessionKey(sid))).toBeNull();
  });
});
