import { isValidSubdomain, siteKey } from "@is-in/shared";
import { json } from "../http";
import type { ControlPlaneHandler } from "./types";

export const postAvailability: ControlPlaneHandler = async (request, env) => {
  let body: { subdomain?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const raw = typeof body.subdomain === "string" ? body.subdomain : "";
  const subdomain = raw.trim().toLowerCase();
  if (!isValidSubdomain(subdomain)) {
    return json({ available: false, reason: "invalid_or_reserved" });
  }
  const existing = await env.KV.get(siteKey(subdomain));
  return json({ available: !existing, subdomain });
};
