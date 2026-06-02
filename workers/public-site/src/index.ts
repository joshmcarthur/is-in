import { resolveWebForward, type SiteRecord, siteKey } from "@is-in/shared";
import { Hono } from "hono";
import { parseSiteHost } from "./parse-site-host";

export type PublicEnv = {
  KV: KVNamespace;
  ROOT_DOMAIN: string;
};

const app = new Hono<{ Bindings: PublicEnv }>();

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

  const rule = resolveWebForward(record, c.req.path);
  if (!rule) {
    return c.text("No web forwarding configured yet.", 200);
  }

  return c.redirect(rule.url, rule.status ?? 302);
});

export default { fetch: app.fetch };
