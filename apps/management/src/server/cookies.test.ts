import { describe, expect, it } from "vitest";
import { appendSessionCookie } from "./cookies";

describe("session cookies", () => {
  it("uses SameSite=Lax with Secure on production hosts", () => {
    const headers = new Headers();
    appendSessionCookie(headers, "sid123", "home.is-in.nz", 3600);
    const cookie = headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("SameSite=None");
  });

  it("uses SameSite=Lax without Secure on localhost", () => {
    const headers = new Headers();
    appendSessionCookie(headers, "sid123", "localhost:8788", 3600);
    const cookie = headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toContain("SameSite=None");
  });
});
