import { canonicalEmail } from "@is-in/shared";
import type { ManagementEnv } from "./env";

export type AuthMode = "public" | "operator";

export function parseAuthMode(raw: string | undefined): AuthMode {
  return raw === "operator" ? "operator" : "public";
}

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => canonicalEmail(entry)),
  );
}

/** In operator mode, OTP is only sent to allowlisted addresses (free-tier self-host). */
export function isOtpRecipientAllowed(email: string, env: ManagementEnv): boolean {
  if (parseAuthMode(env.AUTH_MODE) !== "operator") {
    return true;
  }
  const allowlist = parseAllowlist(env.OTP_ALLOWLIST);
  if (allowlist.size === 0) {
    return false;
  }
  return allowlist.has(canonicalEmail(email));
}

export function productName(env: Pick<ManagementEnv, "PRODUCT_NAME" | "ROOT_DOMAIN">): string {
  return env.PRODUCT_NAME?.trim() || env.ROOT_DOMAIN?.trim() || "is-in.nz";
}
