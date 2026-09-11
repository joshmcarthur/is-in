import { routeApi } from "../api/app";
import type { ManagementEnv } from "../env";

const TEST_HOST = "localhost:8788";

export type CallControlPlaneInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  env: ManagementEnv;
};

/** Invoke the control plane the same way Pages Functions do after segment parsing. */
export async function callControlPlane(
  segments: string[],
  init: CallControlPlaneInit,
): Promise<Response> {
  const path = segments.length > 0 ? `/api/${segments.join("/")}` : "/api";
  const url = `http://${TEST_HOST}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("host")) {
    headers.set("host", TEST_HOST);
  }
  const request = new Request(url, { ...init, headers });
  return routeApi(request, init.env);
}

export async function callControlPlaneJson<T = unknown>(
  segments: string[],
  init: CallControlPlaneInit,
): Promise<{ res: Response; status: number; body: T }> {
  const res = await callControlPlane(segments, init);
  const body = (await res.json()) as T;
  return { res, status: res.status, body };
}
