import type { ManagementEnv } from "../env";
import { assertFeatureAccess, isManagementRouteExempt } from "../featureAccess";
import { postOtpStart, postOtpVerify } from "../handlers/auth";
import { postAvailability } from "../handlers/availability";
import { getHealth } from "../handlers/health";
import { getPlatformCapacity, getPlatformStatus } from "../handlers/platform";
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
import { readSession } from "../session";

const OTP_ROUTES = new Set(["/api/v1/auth/otp/start", "/api/v1/auth/otp/verify"]);

type Route = {
  method: string;
  pathname: string;
  handle: ControlPlaneHandler;
  requireSecret?: boolean;
};

const routes: Route[] = [
  { method: "GET", pathname: "/api/health", handle: getHealth, requireSecret: false },
  {
    method: "GET",
    pathname: "/api/v1/platform/capacity",
    handle: getPlatformCapacity,
    requireSecret: false,
  },
  {
    method: "GET",
    pathname: "/api/v1/platform/status",
    handle: getPlatformStatus,
    requireSecret: false,
  },
  { method: "POST", pathname: "/api/v1/availability", handle: postAvailability },
  { method: "POST", pathname: "/api/v1/auth/otp/start", handle: postOtpStart },
  { method: "POST", pathname: "/api/v1/auth/otp/verify", handle: postOtpVerify },
  { method: "GET", pathname: "/api/v1/session/me", handle: getSessionMe },
  { method: "DELETE", pathname: "/api/v1/session", handle: deleteSession },
  { method: "GET", pathname: "/api/v1/sites/me", handle: getSitesMe },
  { method: "POST", pathname: "/api/v1/sites/claim", handle: postSitesClaim },
  { method: "PATCH", pathname: "/api/v1/sites/:subdomain/forwarding", handle: patchSiteForwarding },
  { method: "POST", pathname: "/api/v1/sites/:subdomain/links", handle: postSiteLink },
  { method: "DELETE", pathname: "/api/v1/sites/:subdomain/links/:path+", handle: deleteSiteLink },
  { method: "POST", pathname: "/api/v1/sites/:subdomain/aliases", handle: postSiteAlias },
  {
    method: "DELETE",
    pathname: "/api/v1/sites/:subdomain/aliases/:local",
    handle: deleteSiteAlias,
  },
];

const compiled = routes.map((route) => ({
  ...route,
  pattern: new URLPattern({ pathname: route.pathname }),
}));

function apiSegments(request: Request): string[] {
  return new URL(request.url).pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean);
}

/** Dispatch `/api/*` to a control-plane handler. */
export async function routeApi(request: Request, env: ManagementEnv): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  for (const route of compiled) {
    if (request.method !== route.method) continue;
    if (!route.pattern.exec(request.url)) continue;
    if (route.requireSecret !== false && !env.SESSION_SECRET) {
      return json({ error: "server_misconfigured" }, 500);
    }

    if (!isManagementRouteExempt(pathname, request.method) && !OTP_ROUTES.has(pathname)) {
      const session = await readSession(request, env);
      const blocked = assertFeatureAccess(
        env,
        "management",
        session ? { email: session.email } : undefined,
      );
      if (blocked) return blocked;
    }

    return route.handle(request, env, apiSegments(request));
  }
  return jsonNotFound();
}
