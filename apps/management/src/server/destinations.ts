import { referencedDestinations, type SiteRecord } from "@is-in/shared";
import { hmacSha256Hex, timingSafeEqualHex } from "./crypto";
import { buildDestinationConfirmEmail } from "./email/destinationConfirmEmail";
import type { ManagementEnv } from "./env";
import { productFooter } from "./operatorConfig";
import { buildRateLimitKey, consumeRateLimit, rateLimitBucket } from "./rateLimit";

export const DESTINATION_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

/** Confirmation emails per site + destination (stops the flow being used to spam an inbox). */
export const DESTINATION_CONFIRM_SEND_LIMIT = 3;
export const DESTINATION_CONFIRM_SEND_WINDOW_SEC = 24 * 60 * 60;

type TokenPayload = { s: string; e: string; x: number };

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(encoded: string): string | null {
  try {
    const b64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function signature(secret: string, payload: string): Promise<string> {
  return hmacSha256Hex(secret, `dest-confirm:${payload}`);
}

/** Stateless token: base64url(JSON payload) + "." + HMAC. */
export async function signDestinationToken(
  secret: string,
  subdomain: string,
  email: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<string> {
  const payload = base64UrlEncode(
    JSON.stringify({ s: subdomain, e: email, x: nowSec + DESTINATION_TOKEN_TTL_SEC }),
  );
  return `${payload}.${await signature(secret, payload)}`;
}

export async function verifyDestinationToken(
  secret: string,
  token: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<{ subdomain: string; email: string } | null> {
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  if (!timingSafeEqualHex(sig, await signature(secret, payload))) return null;
  const json = base64UrlDecode(payload);
  if (!json) return null;
  let parsed: Partial<TokenPayload>;
  try {
    parsed = JSON.parse(json) as Partial<TokenPayload>;
  } catch {
    return null;
  }
  if (typeof parsed.s !== "string" || typeof parsed.e !== "string") return null;
  if (typeof parsed.x !== "number" || parsed.x < nowSec) return null;
  return { subdomain: parsed.s, email: parsed.e };
}

/** Destinations an alias uses that their recipient has not confirmed yet. */
export function pendingDestinations(site: SiteRecord): string[] {
  return [...referencedDestinations(site)].filter((d) => !site.confirmedDestinations?.[d]);
}

/** Drop confirmations for destinations no alias uses any more. */
export function pruneConfirmations(site: SiteRecord): void {
  if (!site.confirmedDestinations) return;
  const used = referencedDestinations(site);
  for (const destination of Object.keys(site.confirmedDestinations)) {
    if (!used.has(destination)) delete site.confirmedDestinations[destination];
  }
}

/** Email a confirmation link to each unconfirmed destination. Failures are logged, never thrown. */
export async function sendDestinationConfirmations(
  env: ManagementEnv,
  origin: string,
  subdomain: string,
  site: SiteRecord,
  destinations: string[],
): Promise<void> {
  if (!env.EMAIL) {
    console.warn("EMAIL binding missing; destination confirmations not sent");
    return;
  }
  const siteHost = `${subdomain}.${env.ROOT_DOMAIN}`;
  for (const email of destinations) {
    if (site.confirmedDestinations?.[email]) continue;

    const bucket = await rateLimitBucket(env.SESSION_SECRET, subdomain, email);
    const rl = await consumeRateLimit(
      env.KV,
      buildRateLimitKey("dest-confirm", bucket),
      DESTINATION_CONFIRM_SEND_LIMIT,
      DESTINATION_CONFIRM_SEND_WINDOW_SEC,
    );
    if (!rl.allowed) continue;

    const token = await signDestinationToken(env.SESSION_SECRET, subdomain, email);
    // Token in the fragment: it never reaches server logs or Referer headers.
    const confirmUrl = `${origin}/confirm-destination#token=${token}`;
    const { subject, html, text } = buildDestinationConfirmEmail({
      siteHost,
      confirmUrl,
      expiresDays: DESTINATION_TOKEN_TTL_SEC / 86_400,
      footer: productFooter(env),
    });
    try {
      await env.EMAIL.send({ from: env.OTP_FROM, to: email, subject, html, text });
    } catch (e) {
      console.error("destination_confirm_send_failed", { subdomain, error: String(e) });
    }
  }
}
