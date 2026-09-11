import { apiBase } from "./apiBase";
import { readJson } from "./dom";

export type OwnedSite = Record<string, unknown> & {
  subdomain: string;
  emailAliases?: Record<string, { destinations?: string[] }>;
  webForwards?: Record<string, { url?: string }>;
};

type SessionMe = { authenticated?: boolean; email?: string };
type SitesMe = { sites?: OwnedSite[] };

/** Load the signed-in user and first owned site, or redirect to sign-in/claim. */
export async function requireSessionAndSite(): Promise<{ email: string; site: OwnedSite }> {
  const meRes = await fetch(`${apiBase}/api/v1/session/me`, { credentials: "include" });
  const me = await readJson<SessionMe>(meRes);
  if (!meRes.ok || !me.authenticated || !me.email) {
    window.location.href = "/sign-in";
    throw new Error("redirecting");
  }

  const sitesRes = await fetch(`${apiBase}/api/v1/sites/me`, { credentials: "include" });
  const body = await readJson<SitesMe>(sitesRes);
  const site = body.sites?.[0];
  if (!sitesRes.ok || !site) {
    window.location.href = "/claim";
    throw new Error("redirecting");
  }

  return { email: me.email, site };
}
