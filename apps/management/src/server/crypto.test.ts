import { describe, expect, it } from "vitest";
import { randomOtp6, randomSessionId, timingSafeEqualHex } from "./crypto.js";

describe("timingSafeEqualHex", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqualHex("abc", "abc")).toBe(true);
  });

  it("returns false for different strings or lengths", () => {
    expect(timingSafeEqualHex("abc", "abd")).toBe(false);
    expect(timingSafeEqualHex("ab", "abc")).toBe(false);
  });
});

describe("randomSessionId", () => {
  it("returns URL-safe base64 without padding", () => {
    const id = randomSessionId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(id).not.toContain("=");
  });
});

describe("randomOtp6", () => {
  it("returns six digit strings", () => {
    const code = randomOtp6();
    expect(code).toMatch(/^\d{6}$/);
  });
});
