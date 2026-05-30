import { describe, expect, it } from "vitest";
import { parseRecipientTo } from "./parse-recipient.js";

describe("parseRecipientTo", () => {
  it("extracts address from angle-bracket form", () => {
    expect(parseRecipientTo("Alice <bob@test.is-in.nz>")).toBe("bob@test.is-in.nz");
  });

  it("extracts bare address", () => {
    expect(parseRecipientTo("bob@test.is-in.nz")).toBe("bob@test.is-in.nz");
  });

  it("returns null when no address found", () => {
    expect(parseRecipientTo("not an email")).toBe(null);
    expect(parseRecipientTo("")).toBe(null);
  });
});
