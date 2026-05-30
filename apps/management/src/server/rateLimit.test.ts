import { describe, expect, it } from "vitest";
import { buildRateLimitKey, consumeRateLimit, type RateLimitKv } from "./rateLimit.js";

function mockKv(initial = new Map<string, string>()): RateLimitKv {
  const store = new Map(initial);
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("consumeRateLimit", () => {
  it("allows requests until the limit is reached", async () => {
    const kv = mockKv();
    const key = buildRateLimitKey("test", "bucket");

    for (let i = 1; i <= 3; i++) {
      const r = await consumeRateLimit(kv, key, 3, 60);
      expect(r).toEqual({ allowed: true, count: i });
    }

    const blocked = await consumeRateLimit(kv, key, 3, 60);
    expect(blocked).toEqual({ allowed: false, count: 3 });
  });

  it("treats corrupt counters as zero", async () => {
    const kv = mockKv(new Map([["ratelimit:test:x", "not-a-number"]]));
    const r = await consumeRateLimit(kv, "ratelimit:test:x", 2, 60);
    expect(r).toEqual({ allowed: true, count: 1 });
  });
});
