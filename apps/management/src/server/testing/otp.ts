import { canonicalEmail, type OtpRecord, otpKey } from "@is-in/shared";
import { hmacSha256Hex } from "../crypto";
import type { ManagementEnv } from "../env";

const OTP_TTL_SEC = 60 * 10;

/** Seed a valid OTP record in KV for deterministic verify tests. */
export async function seedOtp(env: ManagementEnv, email: string, code: string): Promise<void> {
  const canonical = canonicalEmail(email);
  const hash = await hmacSha256Hex(env.SESSION_SECRET, `otp:${canonical}:${code}`);
  const exp = Math.floor(Date.now() / 1000) + OTP_TTL_SEC;
  const rec: OtpRecord = { hash, exp, attempts: 0 };
  await env.KV.put(otpKey(canonical), JSON.stringify(rec), {
    expirationTtl: OTP_TTL_SEC + 60,
  });
}
