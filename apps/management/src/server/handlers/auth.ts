import {
  canonicalEmail,
  type OtpRecord,
  otpKey,
  type SessionRecord,
  sessionKey,
} from "@is-in/shared";
import { appendSessionCookie } from "../cookies";
import { hmacSha256Hex, randomOtp6, randomSessionId, timingSafeEqualHex } from "../crypto";
import { json } from "../http";
import {
  buildRateLimitKey,
  consumeRateLimit,
  OTP_START_EMAIL_IP_LIMIT,
  OTP_START_EMAIL_IP_WINDOW_SEC,
  OTP_START_EMAIL_LIMIT,
  OTP_START_EMAIL_WINDOW_SEC,
  OTP_VERIFY_EMAIL_IP_LIMIT,
  OTP_VERIFY_IP_LIMIT,
  OTP_VERIFY_WINDOW_SEC,
  rateLimitBucket,
} from "../rateLimit";
import { SESSION_TTL_SEC } from "../session";
import { isValidDestinationEmail } from "../validate";
import type { ControlPlaneHandler } from "./types";

const OTP_TTL_SEC = 60 * 10;
const MAX_OTP_ATTEMPTS = 8;

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

export const postOtpStart: ControlPlaneHandler = async (request, env) => {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const emailRaw = typeof body.email === "string" ? body.email : "";
  if (!isValidDestinationEmail(emailRaw)) {
    return json({ ok: true });
  }
  const email = canonicalEmail(emailRaw);
  const ip = clientIp(request);
  const secret = env.SESSION_SECRET;

  const emailBucket = await rateLimitBucket(secret, email);
  const emailRl = await consumeRateLimit(
    env.KV,
    buildRateLimitKey("otp-start-email", emailBucket),
    OTP_START_EMAIL_LIMIT,
    OTP_START_EMAIL_WINDOW_SEC,
  );
  if (!emailRl.allowed) {
    return json({ ok: true });
  }

  const emailIpBucket = await rateLimitBucket(secret, email, ip);
  const emailIpRl = await consumeRateLimit(
    env.KV,
    buildRateLimitKey("otp-start", emailIpBucket),
    OTP_START_EMAIL_IP_LIMIT,
    OTP_START_EMAIL_IP_WINDOW_SEC,
  );
  if (!emailIpRl.allowed) {
    return json({ ok: true });
  }

  const code = randomOtp6();
  const hash = await hmacSha256Hex(env.SESSION_SECRET, `otp:${email}:${code}`);
  const exp = Math.floor(Date.now() / 1000) + OTP_TTL_SEC;
  const rec: OtpRecord = { hash, exp, attempts: 0 };
  await env.KV.put(otpKey(email), JSON.stringify(rec), { expirationTtl: OTP_TTL_SEC + 60 });

  if (env.EMAIL) {
    try {
      await env.EMAIL.send({
        from: env.OTP_FROM,
        to: email,
        subject: env.OTP_SUBJECT,
        text: `Your sign-in code is: ${code}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
      });
    } catch (e) {
      console.error("otp_email_send_failed", e);
    }
  } else {
    console.warn("EMAIL binding missing; OTP not sent (dev?)");
  }

  return json({ ok: true });
};

export const postOtpVerify: ControlPlaneHandler = async (request, env) => {
  const host = request.headers.get("host") ?? "";
  const ip = clientIp(request);
  const secret = env.SESSION_SECRET;

  const ipBucket = await rateLimitBucket(secret, ip);
  const ipRl = await consumeRateLimit(
    env.KV,
    buildRateLimitKey("otp-verify-ip", ipBucket),
    OTP_VERIFY_IP_LIMIT,
    OTP_VERIFY_WINDOW_SEC,
  );
  if (!ipRl.allowed) {
    return json({ error: "invalid_code" }, 401);
  }

  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!isValidDestinationEmail(emailRaw) || !/^\d{6}$/.test(code)) {
    return json({ error: "invalid_request" }, 400);
  }
  const email = canonicalEmail(emailRaw);

  const emailIpBucket = await rateLimitBucket(secret, email, ip);
  const emailIpRl = await consumeRateLimit(
    env.KV,
    buildRateLimitKey("otp-verify", emailIpBucket),
    OTP_VERIFY_EMAIL_IP_LIMIT,
    OTP_VERIFY_WINDOW_SEC,
  );
  if (!emailIpRl.allowed) {
    return json({ error: "invalid_code" }, 401);
  }

  const key = otpKey(email);
  const raw = await env.KV.get(key);
  if (!raw) {
    return json({ error: "invalid_code" }, 401);
  }
  let otp: OtpRecord;
  try {
    otp = JSON.parse(raw) as OtpRecord;
  } catch {
    return json({ error: "invalid_code" }, 401);
  }
  const now = Math.floor(Date.now() / 1000);
  if (otp.exp < now || otp.attempts >= MAX_OTP_ATTEMPTS) {
    await env.KV.delete(key);
    return json({ error: "invalid_code" }, 401);
  }
  const expect = await hmacSha256Hex(env.SESSION_SECRET, `otp:${email}:${code}`);
  if (!timingSafeEqualHex(expect, otp.hash)) {
    otp.attempts += 1;
    await env.KV.put(key, JSON.stringify(otp), { expirationTtl: OTP_TTL_SEC + 60 });
    return json({ error: "invalid_code" }, 401);
  }
  await env.KV.delete(key);

  const sid = randomSessionId();
  const sess: SessionRecord = { email, exp: now + SESSION_TTL_SEC };
  await env.KV.put(sessionKey(sid), JSON.stringify(sess), {
    expirationTtl: SESSION_TTL_SEC + 3600,
  });

  const headers = new Headers();
  appendSessionCookie(headers, sid, host, SESSION_TTL_SEC);
  return json({ ok: true }, 200, headers);
};
