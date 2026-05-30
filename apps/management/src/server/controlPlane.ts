import type { ManagementEnv } from "./env";
import { postOtpStart, postOtpVerify } from "./handlers/auth";
import { postAvailability } from "./handlers/availability";
import { getHealth } from "./handlers/health";
import { deleteSession, getSessionMe } from "./handlers/session";
import {
  deleteSiteAlias,
  deleteSiteLink,
  getSitesMe,
  matchesDeleteSiteAlias,
  matchesDeleteSiteLink,
  matchesPatchSiteForwarding,
  matchesPostSiteAlias,
  matchesPostSiteLink,
  patchSiteForwarding,
  postSiteAlias,
  postSiteLink,
  postSitesClaim,
} from "./handlers/sites";
import type { ControlPlaneHandler } from "./handlers/types";
import { json } from "./http";

type RouteEntry = {
  method: string;
  path: string;
  handle: ControlPlaneHandler;
};

const routes: RouteEntry[] = [
  { method: "GET", path: "health", handle: getHealth },
  { method: "POST", path: "v1/availability", handle: postAvailability },
  { method: "POST", path: "v1/auth/otp/start", handle: postOtpStart },
  { method: "POST", path: "v1/auth/otp/verify", handle: postOtpVerify },
  { method: "GET", path: "v1/session/me", handle: getSessionMe },
  { method: "DELETE", path: "v1/session", handle: deleteSession },
  { method: "GET", path: "v1/sites/me", handle: getSitesMe },
  { method: "POST", path: "v1/sites/claim", handle: postSitesClaim },
];

const routeByKey = new Map(routes.map((r) => [`${r.method} ${r.path}`, r]));

/** Route Pages Function `/api/*` (segments = path after `/api/`, slash-separated). */
export async function routeControlPlane(
  request: Request,
  env: ManagementEnv,
  segments: string[],
): Promise<Response | null> {
  if (!env.SESSION_SECRET) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const method = request.method;
  const path = segments.join("/");

  if (method === "PATCH" && matchesPatchSiteForwarding(segments)) {
    return patchSiteForwarding(request, env, segments);
  }

  if (method === "POST" && matchesPostSiteLink(segments)) {
    return postSiteLink(request, env, segments);
  }

  if (method === "DELETE" && matchesDeleteSiteLink(segments)) {
    return deleteSiteLink(request, env, segments);
  }

  if (method === "POST" && matchesPostSiteAlias(segments)) {
    return postSiteAlias(request, env, segments);
  }

  if (method === "DELETE" && matchesDeleteSiteAlias(segments)) {
    return deleteSiteAlias(request, env, segments);
  }

  const hit = routeByKey.get(`${method} ${path}`);
  if (!hit) return null;

  return hit.handle(request, env, segments);
}
