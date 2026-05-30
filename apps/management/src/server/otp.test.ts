import { otpKey } from "@is-in/shared";
import { describe, expect, it, vi } from "vitest";
import * as crypto from "./crypto.js";
import { callControlPlane, callControlPlaneJson } from "./testing/api.js";
import { TEST_EMAIL, useControlPlaneTest } from "./testing/hooks.js";
import { seedOtp } from "./testing/otp.js";
import { sessionCookie } from "./testing/session.js";

describe("otp", () => {
  const test = useControlPlaneTest();

  it("returns 400 for invalid JSON on start", async () => {
    const { status, body } = await callControlPlaneJson(["v1", "auth", "otp", "start"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
      env: test.env,
    });
    expect(status).toBe(400);
    expect(body).toEqual({ error: "invalid_json" });
  });

  it("returns ok for invalid email without leaking", async () => {
    const { status, body } = await callControlPlaneJson(["v1", "auth", "otp", "start"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
      env: test.env,
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    const otp = await test.env.KV.get(otpKey("not-an-email"));
    expect(otp).toBeNull();
  });

  it("stores OTP and sends email on start", async () => {
    vi.spyOn(crypto, "randomOtp6").mockReturnValue("123456");
    const { status, body } = await callControlPlaneJson(["v1", "auth", "otp", "start"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL }),
      env: test.env,
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(await test.env.KV.get(otpKey(TEST_EMAIL))).not.toBeNull();
    expect(test.sentEmails).toHaveLength(1);
    const email = test.sentEmails[0];
    expect(email?.text).toContain("123 456");
    expect(email?.html).toContain("123 456");
    expect(email?.html).toContain("Here is your sign in code");
    expect(email?.html).toContain("This code will expire in 10 minutes.");
    expect(email?.html).toContain(
      "If you didn't request this code, you can safely ignore this email.",
    );
    expect(email?.html).toContain("is-in.nz — your place on the NZ internet.");
  });

  it("returns 401 for wrong verify code", async () => {
    await seedOtp(test.env, TEST_EMAIL, "123456");
    const { status, body } = await callControlPlaneJson(["v1", "auth", "otp", "verify"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, code: "000000" }),
      env: test.env,
    });
    expect(status).toBe(401);
    expect(body).toEqual({ error: "invalid_code" });
  });

  it("verifies OTP and sets session cookie", async () => {
    await seedOtp(test.env, TEST_EMAIL, "123456");
    const res = await callControlPlane(["v1", "auth", "otp", "verify"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, code: "123456" }),
      env: test.env,
    });
    expect(res?.status).toBe(200);
    if (!res) throw new Error("expected response");
    expect(sessionCookie(res)).toBeDefined();
  });

  it("completes start then verify using captured email code", async () => {
    vi.spyOn(crypto, "randomOtp6").mockReturnValue("654321");
    await callControlPlane(["v1", "auth", "otp", "start"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL }),
      env: test.env,
    });
    const sent = test.sentEmails[0];
    expect(sent?.text).toContain("654 321");
    expect(sent?.html).toContain("654 321");

    const verifyRes = await callControlPlane(["v1", "auth", "otp", "verify"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, code: "654321" }),
      env: test.env,
    });
    expect(verifyRes?.status).toBe(200);
    if (!verifyRes) throw new Error("expected response");
    expect(sessionCookie(verifyRes)).toBeDefined();
  });
});
