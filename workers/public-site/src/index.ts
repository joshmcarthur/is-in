import { siteKey, type SiteRecord } from "@is-in/shared";
import { Hono } from "hono";

export type PublicEnv = {
  KV: KVNamespace;
  ROOT_DOMAIN: string;
};

const app = new Hono<{ Bindings: PublicEnv }>();

function parseSiteHost(host: string, rootDomain: string): string | null {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  const root = rootDomain.toLowerCase();
  if (h === root || h === `www.${root}`) return null;
  const suffix = `.${root}`;
  if (!h.endsWith(suffix)) return null;
  const sub = h.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) return null;
  return sub;
}

app.all("*", async (c) => {
  const host = c.req.header("host") ?? "";
  const root = c.env.ROOT_DOMAIN;
  const site = parseSiteHost(host, root);
  if (!site) {
    return c.text("is-in.nz", 404);
  }

  const raw = await c.env.KV.get(siteKey(site));
  if (!raw) {
    return c.text("Site not found.", 404);
  }
  let record: SiteRecord;
  try {
    record = JSON.parse(raw) as SiteRecord;
  } catch {
    return c.text("Site not found.", 404);
  }

  if (!record.webForwardUrl) {
    return c.text("No web forwarding configured yet.", 200);
  }

  return c.redirect(record.webForwardUrl, 302);
});

export default { fetch: app.fetch };
