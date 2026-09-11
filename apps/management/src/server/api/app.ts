import type { ManagementEnv } from "../env";
import { postOtpStart, postOtpVerify } from "../handlers/auth";
import { postAvailability } from "../handlers/availability";
import { getHealth } from "../handlers/health";
import { deleteSession, getSessionMe } from "../handlers/session";
import {
  deleteSiteAlias,
  deleteSiteLink,
  getSitesMe,
  patchSiteForwarding,
  postSiteAlias,
  postSiteLink,
  postSitesClaim,
} from "../handlers/sites";
import type { ControlPlaneHandler } from "../handlers/types";
import { json, jsonNotFound } from "../http";

const STATIC_ROUTES = new Map<string, ControlPlaneHandler>([
  ["POST v1/availability", postAvailability],
  ["POST v1/auth/otp/start", postOtpStart],
  ["POST v1/auth/otp/verify", postOtpVerify],
  ["GET v1/session/me", getSessionMe],
  ["DELETE v1/session", deleteSession],
  ["GET v1/sites/me", getSitesMe],
  ["POST v1/sites/claim", postSitesClaim],
]);

function apiSegments(request: Request): string[] {
  return new URL(request.url).pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean);
}

function matchSitesResource(
  segments: string[],
  resource: string,
  length: number,
  rest = false,
): boolean {
  const lengthOk = rest ? segments.length >= length : segments.length === length;
  return lengthOk && segments[0] === "v1" && segments[1] === "sites" && segments[3] === resource;
}

/** Dispatch `/api/*` (path after `/api/`) to a control-plane handler. */
export async function routeApi(request: Request, env: ManagementEnv): Promise<Response> {
  const segments = apiSegments(request);
  const method = request.method;
  const key = `${method} ${segments.join("/")}`;

  if (key === "GET health") {
    return getHealth(request, env, segments);
  }

  if (!env.SESSION_SECRET) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const staticHandler = STATIC_ROUTES.get(key);
  if (staticHandler) {
    return staticHandler(request, env, segments);
  }

  if (method === "PATCH" && matchSitesResource(segments, "forwarding", 4)) {
    return patchSiteForwarding(request, env, segments);
  }
  if (method === "POST" && matchSitesResource(segments, "links", 4)) {
    return postSiteLink(request, env, segments);
  }
  if (method === "DELETE" && matchSitesResource(segments, "links", 5, true)) {
    return deleteSiteLink(request, env, segments);
  }
  if (method === "POST" && matchSitesResource(segments, "aliases", 4)) {
    return postSiteAlias(request, env, segments);
  }
  if (method === "DELETE" && matchSitesResource(segments, "aliases", 5)) {
    return deleteSiteAlias(request, env, segments);
  }

  return jsonNotFound();
}
