import { createExecutionContext, reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { CATCH_ALL_KEY, createEmptySiteRecord, type SiteRecord, siteKey } from "@is-in/shared";
import { afterEach, describe, expect, it } from "vitest";
import worker from "./index.js";

function siteWithAliases(destinations: string[]): SiteRecord {
  return {
    ...createEmptySiteRecord("owner@example.com", "2025-01-01T00:00:00.000Z"),
    emailAliases: { [CATCH_ALL_KEY]: { destinations } },
  };
}

function mockMessage(to: string) {
  const forwarded: string[] = [];
  const message = {
    headers: new Headers({ to }),
    forward: async (destination: string) => {
      forwarded.push(destination);
    },
  } as unknown as ForwardableEmailMessage;
  return { message, forwarded };
}

describe("email-inbound worker", () => {
  afterEach(async () => {
    await reset();
  });

  it("forwards to all configured destinations", async () => {
    await env.KV.put(
      siteKey("demo"),
      JSON.stringify(siteWithAliases(["one@example.com", "two@example.com"])),
    );
    const { message, forwarded } = mockMessage("anything@demo.is-in.nz");
    const ctx = createExecutionContext();
    await worker.email(message, env, ctx);
    expect(forwarded).toEqual(["one@example.com", "two@example.com"]);
  });

  it("drops mail for unknown subdomain without throwing", async () => {
    const { message, forwarded } = mockMessage("anything@missing.is-in.nz");
    const ctx = createExecutionContext();
    await expect(worker.email(message, env, ctx)).resolves.toBeUndefined();
    expect(forwarded).toEqual([]);
  });

  it("drops mail when alias is missing", async () => {
    await env.KV.put(
      siteKey("demo"),
      JSON.stringify(createEmptySiteRecord("owner@example.com", "2025-01-01T00:00:00.000Z")),
    );
    const { message, forwarded } = mockMessage("anything@demo.is-in.nz");
    const ctx = createExecutionContext();
    await worker.email(message, env, ctx);
    expect(forwarded).toEqual([]);
  });
});
