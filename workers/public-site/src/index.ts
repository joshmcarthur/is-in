import {
  parseFeatureEnabled,
  parseSiteHost,
  parseSiteRecord,
  resolveWebForward,
  siteKey,
  wrapCloudflareKv,
} from "@is-in/shared";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!parseFeatureEnabled(env.WEB_REDIRECTS_ENABLED)) {
      return new Response("Web redirects are temporarily unavailable.", { status: 503 });
    }

    const host = request.headers.get("host") ?? "";
    const root = env.ROOT_DOMAIN;
    const productName = env.PRODUCT_NAME ?? root;
    const site = parseSiteHost(host, root);
    if (!site) {
      return new Response(productName, { status: 404 });
    }

    const store = wrapCloudflareKv(env.KV);
    const raw = await store.get(siteKey(site));
    if (!raw) {
      return new Response("Site not found.", { status: 404 });
    }
    const record = parseSiteRecord(raw);
    if (!record) {
      return new Response("Site not found.", { status: 404 });
    }

    const rule = resolveWebForward(record, new URL(request.url).pathname);
    if (!rule) {
      return new Response("No web forwarding configured yet.", { status: 200 });
    }

    return Response.redirect(rule.url, rule.status ?? 302);
  },
} satisfies ExportedHandler<Env>;
