export type PlatformStats = {
  claimedSites: number;
};

export function platformStatsKey(): string {
  return "platform:stats";
}

export function parsePlatformStats(raw: string | null): PlatformStats | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { claimedSites?: unknown };
    if (
      typeof value.claimedSites !== "number" ||
      !Number.isInteger(value.claimedSites) ||
      value.claimedSites < 0
    ) {
      return null;
    }
    return { claimedSites: value.claimedSites };
  } catch {
    return null;
  }
}
