import {
  parseSiteFromEmailAddress,
  parseSiteRecord,
  resolveEmailAlias,
  siteKey,
  wrapCloudflareKv,
} from "@is-in/shared";
import { parseRecipientTo } from "./parse-recipient.js";

type DropReason = "invalid_recipient" | "invalid_address" | "no_site" | "no_alias";

function logDrop(reason: DropReason, detail: Record<string, string>): void {
  console.warn("email_inbound_drop", { reason, ...detail });
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const root = env.ROOT_DOMAIN.toLowerCase();
    const toHeader = message.headers.get("to") ?? message.headers.get("To") ?? "";
    const addr = parseRecipientTo(toHeader);
    if (!addr) {
      logDrop("invalid_recipient", { to: toHeader.slice(0, 120) });
      return;
    }

    const sub = parseSiteFromEmailAddress(addr, root);
    if (!sub) {
      logDrop("invalid_address", { addr });
      return;
    }

    const store = wrapCloudflareKv(env.KV);
    const raw = await store.get(siteKey(sub));
    if (!raw) {
      logDrop("no_site", { subdomain: sub, addr });
      return;
    }
    const site = parseSiteRecord(raw);
    if (!site) {
      logDrop("no_site", { subdomain: sub, addr });
      return;
    }

    const at = addr.lastIndexOf("@");
    const local = addr.slice(0, at);
    const alias = resolveEmailAlias(site, local);
    const destinations = alias?.destinations ?? [];
    if (destinations.length === 0) {
      logDrop("no_alias", { subdomain: sub, local, addr });
      return;
    }

    for (const destination of destinations) {
      await message.forward(destination);
    }
  },
} satisfies ExportedHandler<Env>;
