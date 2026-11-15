import { describe, expect, it } from "vitest";
import {
  DESTINATION_TOKEN_TTL_SEC,
  signDestinationToken,
  verifyDestinationToken,
} from "./destinations";

const SECRET = "test-session-secret-at-least-32-chars";
const NOW = 1_800_000_000;

describe("destination confirmation tokens", () => {
  it("round-trips site and email", async () => {
    const token = await signDestinationToken(SECRET, "demo", "fwd@example.com", NOW);
    await expect(verifyDestinationToken(SECRET, token, NOW + 60)).resolves.toEqual({
      subdomain: "demo",
      email: "fwd@example.com",
    });
  });

  it("rejects a token signed with another secret or with an edited payload", async () => {
    const token = await signDestinationToken(SECRET, "demo", "fwd@example.com", NOW);
    await expect(
      verifyDestinationToken("another-secret-of-sufficient-length", token, NOW),
    ).resolves.toBeNull();

    const forged = await signDestinationToken(SECRET, "demo", "victim@example.com", NOW);
    const [, sig] = token.split(".");
    const [forgedPayload] = forged.split(".");
    await expect(
      verifyDestinationToken(SECRET, `${forgedPayload}.${sig}`, NOW),
    ).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signDestinationToken(SECRET, "demo", "fwd@example.com", NOW);
    await expect(
      verifyDestinationToken(SECRET, token, NOW + DESTINATION_TOKEN_TTL_SEC + 1),
    ).resolves.toBeNull();
  });
});
