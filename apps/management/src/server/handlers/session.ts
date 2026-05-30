import { sessionKey } from "@is-in/shared";
import { appendClearSessionCookie, getCookie, SESSION_COOKIE } from "../cookies";
import { json } from "../http";
import { readSession } from "../session";
import type { ControlPlaneHandler } from "./types";

export const getSessionMe: ControlPlaneHandler = async (request, env) => {
  const s = await readSession(request, env);
  if (!s) return json({ authenticated: false });
  return json({ authenticated: true, email: s.email });
};

export const deleteSession: ControlPlaneHandler = async (request, env) => {
  const host = request.headers.get("host") ?? "";
  const sid = getCookie(request, SESSION_COOKIE);
  if (sid) await env.KV.delete(sessionKey(sid));
  const headers = new Headers();
  appendClearSessionCookie(headers, host);
  return json({ ok: true }, 200, headers);
};
