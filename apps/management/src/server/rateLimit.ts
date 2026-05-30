import { ratelimitKey } from "@is-in/shared";
import { hmacSha256Hex } from "./crypto";

/** OTP send: per email + IP (prevents inbox spam from one client). */
export const OTP_START_EMAIL_IP_LIMIT = 5;
export const OTP_START_EMAIL_IP_WINDOW_SEC = 15 * 60;

/** OTP send: per email across all IPs (limits distributed abuse on one address). */
export const OTP_START_EMAIL_LIMIT = 8;
export const OTP_START_EMAIL_WINDOW_SEC = 60 * 60;

/** Code verify: per email + IP (complements per-OTP attempt cap). */
export const OTP_VERIFY_EMAIL_IP_LIMIT = 12;
export const OTP_VERIFY_IP_LIMIT = 40;
export const OTP_VERIFY_WINDOW_SEC = 15 * 60;

export type RateLimitResult = {
  allowed: boolean;
  count: number;
};

/** Subset of KV used by rate limiting (easier to mock in tests). */
export type RateLimitKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export async function rateLimitBucket(secret: string, ...parts: string[]): Promise<string> {
  const h = await hmacSha256Hex(secret, parts.join(":"));
  return h.slice(0, 16);
}

export function buildRateLimitKey(scope: string, bucket: string): string {
  return ratelimitKey(scope, bucket);
}

/** Increment a KV counter; returns whether the request is within the limit. */
export async function consumeRateLimit(
  kv: RateLimitKv,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const raw = await kv.get(key);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  const current = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  if (current >= limit) {
    return { allowed: false, count: current };
  }
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: windowSec });
  return { allowed: true, count: next };
}
