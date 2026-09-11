/**
 * Shared browser helper for management pages (session + first owned site).
 * @param {string} apiBase
 * @returns {Promise<{ email: string, site: Record<string, unknown> & { subdomain: string } }>}
 */
async function requireSessionAndSite(apiBase) {
  const meRes = await fetch(`${apiBase}/api/v1/session/me`, { credentials: "include" });
  const me = await meRes.json();
  if (!meRes.ok || !me.authenticated) {
    window.location.href = "/sign-in";
    throw new Error("redirecting");
  }

  const sitesRes = await fetch(`${apiBase}/api/v1/sites/me`, { credentials: "include" });
  const body = await sitesRes.json();
  if (!sitesRes.ok || !body.sites?.length) {
    window.location.href = "/claim";
    throw new Error("redirecting");
  }

  return { email: me.email, site: body.sites[0] };
}

window.requireSessionAndSite = requireSessionAndSite;
