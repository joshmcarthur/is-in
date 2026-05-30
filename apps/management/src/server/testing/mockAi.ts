import type { ManagementEnv } from "../env";

export function createAllowingMockAi(): Ai {
  return {
    run: async () => ({
      response: JSON.stringify({ allowed: true, reason: null }),
    }),
  } as unknown as Ai;
}

export function createMockAi(
  verdict: { allowed: boolean; reason: string | null } | "malformed" | "throw",
): Ai {
  if (verdict === "throw") {
    return {
      run: async () => {
        throw new Error("ai_unavailable");
      },
    } as unknown as Ai;
  }
  if (verdict === "malformed") {
    return {
      run: async () => ({ response: "not json" }),
    } as unknown as Ai;
  }
  return {
    run: async () => ({
      response: JSON.stringify(verdict),
    }),
  } as unknown as Ai;
}

export function withModerationOff(env: ManagementEnv): ManagementEnv {
  return { ...env, SUBDOMAIN_MODERATION: "off" };
}
