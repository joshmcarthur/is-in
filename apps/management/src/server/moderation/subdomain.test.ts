import { describe, expect, it, vi } from "vitest";
import { createMockAi } from "../testing/mockAi";
import { moderateSubdomain, parseModerationVerdict } from "./subdomain";

describe("parseModerationVerdict", () => {
  it("parses allowed verdict", () => {
    expect(parseModerationVerdict('{"allowed": true, "reason": null}')).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it("parses rejected verdict", () => {
    expect(parseModerationVerdict('{"allowed": false, "reason": "brand impersonation"}')).toEqual({
      allowed: false,
      reason: "brand impersonation",
    });
  });

  it("strips markdown fences", () => {
    expect(parseModerationVerdict('```json\n{"allowed": true, "reason": null}\n```')).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it("returns null for malformed JSON", () => {
    expect(parseModerationVerdict("not json")).toBeNull();
  });
});

describe("moderateSubdomain", () => {
  it("allows benign names", async () => {
    const ai = createMockAi({ allowed: true, reason: null });
    await expect(moderateSubdomain(ai, "josh")).resolves.toEqual({ ok: true });
    await expect(moderateSubdomain(ai, "coffee-shop")).resolves.toEqual({ ok: true });
  });

  it("rejects policy violations", async () => {
    const ai = createMockAi({ allowed: false, reason: "brand impersonation" });
    await expect(moderateSubdomain(ai, "paypal-support")).resolves.toEqual({
      ok: false,
      reason: "policy",
    });
  });

  it("returns unavailable for malformed model output", async () => {
    const ai = createMockAi("malformed");
    await expect(moderateSubdomain(ai, "test")).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("returns unavailable when AI throws", async () => {
    const ai = createMockAi("throw");
    await expect(moderateSubdomain(ai, "test")).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("returns unavailable on timeout", async () => {
    vi.useFakeTimers();
    const ai = {
      run: () => new Promise(() => {}),
    } as unknown as Ai;
    const pending = moderateSubdomain(ai, "slow");
    await vi.advanceTimersByTimeAsync(2500);
    await expect(pending).resolves.toEqual({ ok: false, reason: "unavailable" });
    vi.useRealTimers();
  });
});
