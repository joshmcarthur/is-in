import { describe, expect, it } from "vitest";
import { parseSiteHost } from "./parse-site-host";

describe("parseSiteHost", () => {
  it("parses production hostnames", () => {
    expect(parseSiteHost("josh.is-in.nz", "is-in.nz")).toBe("josh");
    expect(parseSiteHost("www.is-in.nz", "is-in.nz")).toBeNull();
    expect(parseSiteHost("is-in.nz", "is-in.nz")).toBeNull();
  });

  it("parses test environment nested hostnames", () => {
    expect(parseSiteHost("josh.test.is-in.nz", "test.is-in.nz")).toBe("josh");
    expect(parseSiteHost("www.test.is-in.nz", "test.is-in.nz")).toBeNull();
    expect(parseSiteHost("test.is-in.nz", "test.is-in.nz")).toBeNull();
  });
});
