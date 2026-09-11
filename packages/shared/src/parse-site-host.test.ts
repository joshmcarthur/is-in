import { parseSiteHost } from "@is-in/shared";
import { describe, expect, it } from "vitest";

describe("parseSiteHost", () => {
  it("extracts subdomain from host", () => {
    expect(parseSiteHost("josh.is-in.nz", "is-in.nz")).toBe("josh");
    expect(parseSiteHost("josh.test.is-in.nz", "test.is-in.nz")).toBe("josh");
  });

  it("returns null for apex and www", () => {
    expect(parseSiteHost("is-in.nz", "is-in.nz")).toBeNull();
    expect(parseSiteHost("www.is-in.nz", "is-in.nz")).toBeNull();
  });
});
