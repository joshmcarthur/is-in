import { resolveEmailAlias, type SiteRecord, siteKey } from "@is-in/shared";
import { parseRecipientTo } from "./parse-recipient.js";

export type EmailEnv = {
  KV: KVNamespace;
  ROOT_DOMAIN: string;
};

export default {
  async email(
    message: ForwardableEmailMessage,
    env: EmailEnv,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const root = (env.ROOT_DOMAIN || "is-in.nz").toLowerCase();
    const toHeader = message.headers.get("to") ?? message.headers.get("To") ?? "";
    const addr = parseRecipientTo(toHeader);
    if (!addr) return;

    const at = addr.lastIndexOf("@");
    if (at <= 0) return;
    const domain = addr.slice(at + 1).toLowerCase();
    const suffix = `.${root}`;
    if (!domain.endsWith(suffix) || domain === root) return;
    const sub = domain.slice(0, -suffix.length);
    if (!sub || sub.includes(".")) return;

    const raw = await env.KV.get(siteKey(sub));
    if (!raw) return;
    let site: SiteRecord;
    try {
      site = JSON.parse(raw) as SiteRecord;
    } catch {
      return;
    }
    const local = addr.slice(0, at);
    const alias = resolveEmailAlias(site, local);
    const destination = alias?.destinations[0];
    if (!destination) return;

    await message.forward(destination);
  },
} satisfies ExportedHandler<EmailEnv>;
