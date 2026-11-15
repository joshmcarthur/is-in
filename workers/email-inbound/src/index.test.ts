import { createExecutionContext, reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { CATCH_ALL_KEY, createEmptySiteRecord, type SiteRecord, siteKey } from "@is-in/shared";
import { afterEach, describe, expect, it } from "vitest";
import worker from "./index.js";

function siteWithAliases(destinations: string[], confirmed = destinations): SiteRecord {
  return {
    ...createEmptySiteRecord("owner@example.com", "2025-01-01T00:00:00.000Z"),
    emailAliases: { [CATCH_ALL_KEY]: { destinations } },
    confirmedDestinations: Object.fromEntries(
      confirmed.map((d) => [d, "2025-01-02T00:00:00.000Z"]),
    ),
  };
}

function mockMessage(
  to: string,
  { toHeader = to, failFor = [] as string[] }: { toHeader?: string; failFor?: string[] } = {},
) {
  const forwarded: string[] = [];
  const message = {
    to,
    headers: new Headers({ to: toHeader }),
    forward: async (destination: string) => {
      if (failFor.includes(destination)) throw new Error("destination address not verified");
      forwarded.push(destination);
    },
  } as unknown as ForwardableEmailMessage;
  return { message, forwarded };
}

describe("email-inbound worker", () => {
  afterEach(async () => {
    await reset();
    delete env.INBOUND_EMAIL_ENABLED;
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

  it("routes on the envelope recipient, not the To header", async () => {
    await env.KV.put(siteKey("demo"), JSON.stringify(siteWithAliases(["one@example.com"])));
    const { message, forwarded } = mockMessage("bcc@demo.is-in.nz", {
      toHeader: "List <list@lists.example.org>",
    });
    const ctx = createExecutionContext();
    await worker.email(message, env, ctx);
    expect(forwarded).toEqual(["one@example.com"]);
  });

  it("keeps delivering when one destination fails", async () => {
    await env.KV.put(
      siteKey("demo"),
      JSON.stringify(siteWithAliases(["bad@example.com", "two@example.com"])),
    );
    const { message, forwarded } = mockMessage("anything@demo.is-in.nz", {
      failFor: ["bad@example.com"],
    });
    const ctx = createExecutionContext();
    await expect(worker.email(message, env, ctx)).resolves.toBeUndefined();
    expect(forwarded).toEqual(["two@example.com"]);
  });

  it("skips destinations that have not confirmed", async () => {
    await env.KV.put(
      siteKey("demo"),
      JSON.stringify(siteWithAliases(["one@example.com", "two@example.com"], ["two@example.com"])),
    );
    const { message, forwarded } = mockMessage("anything@demo.is-in.nz");
    const ctx = createExecutionContext();
    await worker.email(message, env, ctx);
    expect(forwarded).toEqual(["two@example.com"]);
  });

  it("drops mail for unknown subdomain without throwing", async () => {
    const { message, forwarded } = mockMessage("anything@missing.is-in.nz");
    const ctx = createExecutionContext();
    await expect(worker.email(message, env, ctx)).resolves.toBeUndefined();
    expect(forwarded).toEqual([]);
  });

  it("drops mail when inbound email is disabled", async () => {
    await env.KV.put(siteKey("demo"), JSON.stringify(siteWithAliases(["one@example.com"])));
    env.INBOUND_EMAIL_ENABLED = "false";
    const { message, forwarded } = mockMessage("anything@demo.is-in.nz");
    const ctx = createExecutionContext();
    await worker.email(message, env, ctx);
    expect(forwarded).toEqual([]);
  });
});
