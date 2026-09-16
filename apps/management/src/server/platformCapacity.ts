import {
  type KvStore,
  type PlatformStats,
  parsePlatformStats,
  platformStatsKey,
} from "@is-in/shared";
import type { ManagementEnv } from "./env";

/** Default true when unset — sign-ups enabled unless explicitly disabled. */
export function parseSignupsEnabled(raw: string | undefined): boolean {
  if (!raw?.trim()) return true;
  const v = raw.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "off" || v === "no") return false;
  return true;
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
  env: Pick<ManagementEnv, "SIGNUPS_ENABLED" | "MAX_CLAIMED_SITES">,
  claimedSites: number,
): boolean {
  if (!parseSignupsEnabled(env.SIGNUPS_ENABLED)) return false;
  const cap = parseMaxClaimedSites(env.MAX_CLAIMED_SITES);
  if (cap === null) return true;
  return claimedSites < cap;
}

export type PublicCapacity = {
  signupsOpen: boolean;
  signupsDisabled: boolean;
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
  const signupsOpen = signupsAcceptingClaims(env, claimedSites);
  return {
    signupsOpen,
    signupsDisabled,
    maxClaimedSites,
    claimedSites,
    remaining: maxClaimedSites === null ? null : Math.max(0, maxClaimedSites - claimedSites),
  };
}
