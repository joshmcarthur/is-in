import { describe, expect, it } from "vitest";
import { isSafeForwardUrl, isValidDestinationEmail } from "./validate.js";

describe("isValidDestinationEmail", () => {
  it("accepts simple addresses", () => {
    expect(isValidDestinationEmail("user@example.com")).toBe(true);
  });

  it("rejects invalid or overlong addresses", () => {
    expect(isValidDestinationEmail("not-an-email")).toBe(false);
    expect(isValidDestinationEmail(`${"a".repeat(250)}@b.co`)).toBe(false);
  });
});

describe("isSafeForwardUrl", () => {
  it("allows http and https public URLs", () => {
    expect(isSafeForwardUrl("https://example.com/path")).toBe(true);
    expect(isSafeForwardUrl("http://example.org")).toBe(true);
  });

  it("blocks localhost and non-http schemes", () => {
    expect(isSafeForwardUrl("https://localhost/")).toBe(false);
    expect(isSafeForwardUrl("https://127.0.0.1/")).toBe(false);
    expect(isSafeForwardUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeForwardUrl("not-a-url")).toBe(false);
  });
});
