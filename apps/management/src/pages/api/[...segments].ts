import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { routeApi } from "../../server/api/app";
import { toManagementEnv } from "../../server/toManagementEnv";

export const prerender = false;

const handle: APIRoute = async (context) => {
  return routeApi(context.request, toManagementEnv(env));
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
