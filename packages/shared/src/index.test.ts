import { describe, expect, it } from "vitest";
import {
  canonicalEmail,
  isValidSubdomain,
  otpKey,
  ratelimitKey,
  siteKey,
  userKey,
} from "./index.js";

describe("canonicalEmail", () => {
  it("trims and lowercases", () => {
    expect(canonicalEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("lowercases local and domain parts", () => {
    expect(canonicalEmail("Bob@MAIL.Example.nz")).toBe("bob@mail.example.nz");
  });

  it("returns lowercased string when @ is missing or at start", () => {
    expect(canonicalEmail("not-an-email")).toBe("not-an-email");
    expect(canonicalEmail("@nodomain")).toBe("@nodomain");
  });
});

describe("isValidSubdomain", () => {
  it("accepts valid labels", () => {
    expect(isValidSubdomain("josh")).toBe(true);
    expect(isValidSubdomain("a1-b2")).toBe(true);
  });

  it("rejects reserved names", () => {
    expect(isValidSubdomain("www")).toBe(false);
    expect(isValidSubdomain("api")).toBe(false);
  });

  it("rejects invalid syntax and length", () => {
    expect(isValidSubdomain("-bad")).toBe(false);
    expect(isValidSubdomain("bad-")).toBe(false);
    expect(isValidSubdomain("")).toBe(false);
    expect(isValidSubdomain("a".repeat(64))).toBe(false);
  });
});

describe("KV key helpers", () => {
  it("builds stable keys", () => {
    expect(siteKey("Josh")).toBe("site:josh");
    expect(userKey("A@B.com")).toBe("user:a@b.com");
    expect(otpKey("  X@Y.nz ")).toBe("otp:x@y.nz");
    expect(ratelimitKey("otp-start", "abc123")).toBe("ratelimit:otp-start:abc123");
  });
});
