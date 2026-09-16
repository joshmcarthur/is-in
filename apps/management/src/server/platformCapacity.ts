import {
  deriveSignupsState,
  hasOperatorGrant,
  type KvStore,
  type PlatformStats,
  parseFeatureEnabled,
  parseOperatorGrants,
  parsePlatformStats,
  platformStatsKey,
  type SignupsState,
} from "@is-in/shared";
import type { ManagementEnv } from "./env";

/** Default true when unset — sign-ups enabled unless explicitly disabled. */
export function parseSignupsEnabled(raw: string | undefined): boolean {
  return parseFeatureEnabled(raw);
}

export function parseMaxClaimedSites(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export async function readClaimedSiteCount(kv: KvStore): Promise<number> {
  const raw = await kv.get(platformStatsKey());
  return parsePlatformStats(raw)?.claimedSites ?? 0;
}

export async function incrementClaimedSiteCount(kv: KvStore): Promise<number> {
  const current = await readClaimedSiteCount(kv);
  const next: PlatformStats = { claimedSites: current + 1 };
  await kv.put(platformStatsKey(), JSON.stringify(next));
  return next.claimedSites;
}

export function signupsAcceptingClaims(
  env: ManagementEnv,
  claimedSites: number,
  email?: string,
): boolean {
  const cap = parseMaxClaimedSites(env.MAX_CLAIMED_SITES);
  const underCap = cap === null || claimedSites < cap;
  if (parseSignupsEnabled(env.SIGNUPS_ENABLED) && underCap) return true;
  if (!email) return false;
  return hasOperatorGrant(parseOperatorGrants(env.OPERATOR_GRANTS), email, "signups");
}

export type PublicCapacity = {
  signupsOpen: boolean;
  signupsDisabled: boolean;
  signupsState: SignupsState;
  maxClaimedSites: number | null;
  claimedSites: number;
  remaining: number | null;
};

export async function getPublicCapacity(
  env: Pick<ManagementEnv, "SIGNUPS_ENABLED" | "MAX_CLAIMED_SITES">,
  kv: KvStore,
): Promise<PublicCapacity> {
  const claimedSites = await readClaimedSiteCount(kv);
  const maxClaimedSites = parseMaxClaimedSites(env.MAX_CLAIMED_SITES);
  const signupsDisabled = !parseSignupsEnabled(env.SIGNUPS_ENABLED);
  const signupsOpen = signupsAcceptingClaims(env as ManagementEnv, claimedSites);
  const signupsState = deriveSignupsState({ signupsOpen, signupsDisabled });
  return {
    signupsOpen,
    signupsDisabled,
    signupsState,
    maxClaimedSites,
    claimedSites,
    remaining: maxClaimedSites === null ? null : Math.max(0, maxClaimedSites - claimedSites),
  };
}
