import type { APIRoute } from "astro";
import { routeControlPlane } from "../../server/controlPlane";
import type { ManagementEnv } from "../../server/env";
import { jsonNotFound } from "../../server/http";

export const prerender = false;

function parseSegments(param: string | undefined): string[] {
  if (!param) return [];
  return param.split("/").filter(Boolean);
}

const handle: APIRoute = async (context) => {
  const segments = parseSegments(context.params.segments);
  const env = context.locals.runtime.env as ManagementEnv;
  const res = await routeControlPlane(context.request, env, segments);
  return res ?? jsonNotFound();
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
