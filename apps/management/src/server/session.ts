import { type SessionRecord, sessionKey } from "@is-in/shared";
import { getCookie, SESSION_COOKIE } from "./cookies";
import type { ManagementEnv } from "./env";

export const SESSION_TTL_SEC = 60 * 60 * 24 * 14;

export async function readSession(
  request: Request,
  env: ManagementEnv,
): Promise<SessionRecord | null> {
  const sid = getCookie(request, SESSION_COOKIE);
  if (!sid) return null;
  const raw = await env.KV.get(sessionKey(sid));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as SessionRecord;
    const now = Math.floor(Date.now() / 1000);
    if (s.exp < now) return null;
    return s;
  } catch {
    return null;
  }
}
