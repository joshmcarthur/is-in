import {
  parseFeatureEnabled,
  parseSiteFromEmailAddress,
  parseSiteRecord,
  resolveEmailAlias,
  type SiteRecord,
  siteKey,
  wrapCloudflareKv,
} from "@is-in/shared";

export type DropReason = "inbound_email_disabled" | "invalid_address" | "no_site" | "no_alias";

export type CheckResult =
  | { action: "continue" }
  | { action: "drop"; reason: DropReason; detail?: Record<string, string> };

/** State built up as checks run. Checks read envelope, headers and KV only — never `message.raw`. */
export type InboundContext = {
  message: ForwardableEmailMessage;
  env: Env;
  recipient: string;
  subdomain?: string;
  site?: SiteRecord;
  destinations: string[];
};

export type MessageCheck = (ctx: InboundContext) => Promise<CheckResult>;

const CONTINUE: CheckResult = { action: "continue" };

export const inboundEnabled: MessageCheck = async (ctx) =>
  parseFeatureEnabled(ctx.env.INBOUND_EMAIL_ENABLED)
    ? CONTINUE
    : { action: "drop", reason: "inbound_email_disabled" };

/** Resolve the envelope recipient to a site and its alias destinations. */
export const resolveRecipient: MessageCheck = async (ctx): Promise<CheckResult> => {
  const { recipient, env } = ctx;
  const subdomain = parseSiteFromEmailAddress(recipient, env.ROOT_DOMAIN.toLowerCase());
  if (!subdomain) return { action: "drop", reason: "invalid_address", detail: { recipient } };

  const raw = await wrapCloudflareKv(env.KV).get(siteKey(subdomain));
  const site = raw ? parseSiteRecord(raw) : null;
  if (!site) return { action: "drop", reason: "no_site", detail: { subdomain, recipient } };

  const local = recipient.slice(0, recipient.lastIndexOf("@"));
  const destinations = resolveEmailAlias(site, local)?.destinations ?? [];
  if (destinations.length === 0) {
    return { action: "drop", reason: "no_alias", detail: { subdomain, local } };
  }

  ctx.subdomain = subdomain;
  ctx.site = site;
  ctx.destinations = destinations;
  return CONTINUE;
};

/** Message-level checks, run in order. The first non-continue result stops processing. */
export const MESSAGE_CHECKS: MessageCheck[] = [inboundEnabled, resolveRecipient];

export async function runMessageChecks(
  ctx: InboundContext,
  checks: MessageCheck[] = MESSAGE_CHECKS,
): Promise<CheckResult> {
  for (const check of checks) {
    const result = await check(ctx);
    if (result.action !== "continue") return result;
  }
  return CONTINUE;
}
