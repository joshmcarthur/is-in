import { canonicalEmail } from "./email.js";

/** Default true when unset — feature enabled unless explicitly disabled. */
export function parseFeatureEnabled(raw: string | undefined): boolean {
  if (!raw?.trim()) return true;
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "off" || v === "no") return false;
  return true;
}

export type OperatorGrant =
  | "management"
  | "otp"
  | "signups"
  | "web_config"
  | "email_config"
  | "all";

const OPERATOR_GRANT_VALUES: ReadonlySet<string> = new Set([
  "management",
  "otp",
  "signups",
  "web_config",
  "email_config",
  "all",
]);

function expandGrant(raw: string): OperatorGrant | null {
  const grant = raw.trim().toLowerCase();
  if (!OPERATOR_GRANT_VALUES.has(grant)) return null;
  return grant as OperatorGrant;
}

/** Parse `email:grant1,grant2;other@example.com:all`. */
export function parseOperatorGrants(raw: string | undefined): Map<string, Set<OperatorGrant>> {
  const grants = new Map<string, Set<OperatorGrant>>();
  if (!raw?.trim()) return grants;

  for (const entry of raw.split(";")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const email = canonicalEmail(trimmed.slice(0, colon).trim());
    const grantPart = trimmed.slice(colon + 1);
    const set = new Set<OperatorGrant>();
    for (const g of grantPart.split(",")) {
      const parsed = expandGrant(g);
      if (parsed) set.add(parsed);
    }
    if (set.size > 0) grants.set(email, set);
  }
  return grants;
}

export function hasOperatorGrant(
  grants: Map<string, Set<OperatorGrant>>,
  email: string,
  grant: OperatorGrant,
): boolean {
  const entry = grants.get(canonicalEmail(email));
  if (!entry) return false;
  if (entry.has("all")) return true;
  return entry.has(grant);
}

export type SignupsState = "open" | "paused" | "full";

export function deriveSignupsState(input: {
  signupsOpen: boolean;
  signupsDisabled: boolean;
}): SignupsState {
  if (input.signupsDisabled) return "paused";
  if (input.signupsOpen) return "open";
  return "full";
}
