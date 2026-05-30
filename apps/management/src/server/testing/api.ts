import { routeControlPlane } from "../controlPlane";
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
): Promise<Response | null> {
  const path = segments.length > 0 ? `/api/${segments.join("/")}` : "/api";
  const url = `http://${TEST_HOST}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("host")) {
    headers.set("host", TEST_HOST);
  }
  const request = new Request(url, { ...init, headers });
  return routeControlPlane(request, init.env, segments);
}

export async function callControlPlaneJson<T = unknown>(
  segments: string[],
  init: CallControlPlaneInit,
): Promise<{ res: Response | null; status: number; body: T | null }> {
  const res = await callControlPlane(segments, init);
  if (!res) {
    return { res: null, status: 404, body: null };
  }
  const body = (await res.json()) as T;
  return { res, status: res.status, body };
}
