import { describe, expect, it } from "vitest";
import { buildOtpEmailContent, formatOtpCode } from "./otpEmail.js";

describe("formatOtpCode", () => {
  it("inserts a space between 3-digit groups", () => {
    expect(formatOtpCode("123456")).toBe("123 456");
  });

  it("returns code unchanged when not 6 digits", () => {
    expect(formatOtpCode("12345")).toBe("12345");
  });
});

describe("buildOtpEmailContent", () => {
  const content = buildOtpEmailContent({ code: "812947", expiresMinutes: 10 });

  it("includes formatted code and copy in html", () => {
    expect(content.html).toContain("812 947");
    expect(content.html).toContain("Here is your sign in code");
    expect(content.html).toContain("This code will expire in 10 minutes.");
    expect(content.html).toContain(
      "If you didn't request this code, you can safely ignore this email.",
    );
    expect(content.html).toContain("is-in.nz — your place on the NZ internet.");
    expect(content.html).toContain("background-color:#ffffff");
    expect(content.html).toContain("border:1px solid #e8e6e3");
    expect(content.html).toContain("font-size:64px");
    expect(content.html).toContain("system-ui");
  });

  it("includes formatted and compact code in text", () => {
    expect(content.text).toContain("812 947");
    expect(content.text).toContain("Here is your sign in code");
    expect(content.text).toContain("This code will expire in 10 minutes.");
    expect(content.text).toContain(
      "If you didn't request this code, you can safely ignore this email.",
    );
    expect(content.text).toContain("is-in.nz — your place on the NZ internet.");
  });
});
