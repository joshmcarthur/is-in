import { canonicalEmail } from "./email.js";
import type { EmailAlias, SiteRecord, WebForward } from "./forwarding.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWebForward(value: unknown): WebForward | null {
  if (!isRecord(value) || typeof value.url !== "string" || !value.url.trim()) {
    return null;
  }
  const status = value.status;
  const forward: WebForward = { url: value.url.trim() };
  if (status === 301 || status === 302) {
    forward.status = status;
  }
  if (value.expiresAt === null || typeof value.expiresAt === "string") {
    forward.expiresAt = value.expiresAt;
  }
  if (typeof value.title === "string" && value.title.trim()) {
    forward.title = value.title.trim();
  }
  return forward;
}

function parseEmailAlias(value: unknown): EmailAlias | null {
  if (!isRecord(value) || !Array.isArray(value.destinations)) {
    return null;
  }
  const destinations = value.destinations.filter(
    (d): d is string => typeof d === "string" && d.length > 0,
  );
  if (destinations.length === 0) return null;
  return { destinations };
}

function parseStringMap<T>(
  raw: unknown,
  parseEntry: (value: unknown) => T | null,
): Record<string, T> | null {
  if (!isRecord(raw)) return null;
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(raw)) {
    const parsed = parseEntry(value);
    if (!parsed) return null;
    out[key] = parsed;
  }
  return out;
}

/** Parse and validate a site document from KV. Returns null when invalid. */
export function parseSiteRecord(raw: string): SiteRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (typeof value.ownerEmail !== "string" || !value.ownerEmail.trim()) return null;
  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) return null;

  const webForwards = parseStringMap(value.webForwards, parseWebForward);
  const emailAliases = parseStringMap(value.emailAliases, parseEmailAlias);
  if (!webForwards || !emailAliases) return null;

  const version = value.version;
  return {
    ownerEmail: canonicalEmail(value.ownerEmail),
    createdAt: value.createdAt,
    ...(typeof version === "number" ? { version } : {}),
    webForwards,
    emailAliases,
  };
}
