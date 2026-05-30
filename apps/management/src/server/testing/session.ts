import { SESSION_COOKIE } from "../cookies";
import type { ManagementEnv } from "../env";
import { callControlPlane } from "./api";
import { seedOtp } from "./otp";

/** Parse `isin_session` from a response Set-Cookie header. */
export function sessionCookie(res: Response): string | undefined {
  const raw = res.headers.get("set-cookie");
  if (!raw) return undefined;
  const match = raw.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return undefined;
  return decodeURIComponent(match[1]);
}

/** Seed OTP and verify; returns session id from Set-Cookie. */
export async function signInViaOtp(
  env: ManagementEnv,
  email: string,
  code = "123456",
): Promise<string> {
  await seedOtp(env, email, code);
  const res = await callControlPlane(["v1", "auth", "otp", "verify"], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code }),
    env,
  });
  if (!res) throw new Error("expected verify response");
  const sid = sessionCookie(res);
  if (!sid) throw new Error("expected session cookie");
  return sid;
}

export function withSessionCookie(cookie: string, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("cookie", `${SESSION_COOKIE}=${encodeURIComponent(cookie)}`);
  return { ...init, headers };
}
