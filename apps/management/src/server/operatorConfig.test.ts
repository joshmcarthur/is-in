import { describe, expect, it } from "vitest";
import { isOtpRecipientAllowed, parseAuthMode, productName } from "./operatorConfig";
import { createTestEnv } from "./testing/testEnv";

describe("operatorConfig", () => {
  it("defaults auth mode to public", () => {
    expect(parseAuthMode(undefined)).toBe("public");
    expect(parseAuthMode("public")).toBe("public");
    expect(parseAuthMode("operator")).toBe("operator");
  });

  it("blocks OTP in operator mode without allowlist", () => {
    const { env } = createTestEnv({
      overrides: { AUTH_MODE: "operator", OTP_ALLOWLIST: undefined },
    });
    expect(isOtpRecipientAllowed("you@example.com", env)).toBe(false);
  });

  it("allows allowlisted OTP recipients in operator mode", () => {
    const { env } = createTestEnv({
      overrides: { AUTH_MODE: "operator", OTP_ALLOWLIST: "you@example.com, Admin@Example.com" },
    });
    expect(isOtpRecipientAllowed("you@example.com", env)).toBe(true);
    expect(isOtpRecipientAllowed("admin@example.com", env)).toBe(true);
    expect(isOtpRecipientAllowed("other@example.com", env)).toBe(false);
  });

  it("derives product name from env", () => {
    const { env } = createTestEnv({
      overrides: { PRODUCT_NAME: "My Zone", ROOT_DOMAIN: "example.com" },
    });
    expect(productName(env)).toBe("My Zone");
  });
});
