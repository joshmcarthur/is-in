import { describe, expect, it } from "vitest";
import { callControlPlane, callControlPlaneJson } from "./testing/api.js";
import { useControlPlaneTest } from "./testing/hooks.js";
import { createTestEnv } from "./testing/testEnv.js";

describe("controlPlane", () => {
  const test = useControlPlaneTest();

  it("returns 500 when SESSION_SECRET is missing", async () => {
    const { env: noSecret } = createTestEnv({
      overrides: { SESSION_SECRET: "" },
    });
    const { status, body } = await callControlPlaneJson(["health"], {
      method: "GET",
      env: noSecret,
    });
    expect(status).toBe(500);
    expect(body).toEqual({ error: "server_misconfigured" });
  });

  it("returns null for unknown routes", async () => {
    const res = await callControlPlane(["v1", "nope"], {
      method: "GET",
      env: test.env,
    });
    expect(res).toBeNull();
  });

  it("GET health returns ok", async () => {
    const { status, body } = await callControlPlaneJson(["health"], {
      method: "GET",
      env: test.env,
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});
