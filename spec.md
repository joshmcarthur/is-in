# Hosted capacity limits (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate public sign-ups at 150 claimed sites with operator controls and public capacity visibility, per ADR-0007 in refs/lore/architectural-decision-records.

**Architecture:** Wrangler vars (`SIGNUPS_ENABLED`, `MAX_CLAIMED_SITES`) plus a KV counter (`platform:stats`) incremented on successful claim. Claim handler checks enabled flag and cap before moderation/KV write. Optional read-only API exposes remaining slots for `/claim` scarcity copy. Forward-destination registry deferred to a follow-up task unless needed before launch.

**Tech Stack:** TypeScript, Hono control plane (`apps/management`), `@is-in/shared` KV helpers, Vitest, Astro claim UI.

## Global Constraints

- Hosted production defaults: `MAX_CLAIMED_SITES=150`, `SIGNUPS_ENABLED=true`
- Self-host/forks: leave `MAX_CLAIMED_SITES` unset (unlimited)
- Claim rejection: HTTP `503`, body `{ "error": "signups_closed" }`
- Counter is monotonic (no site delete yet); do not decrement
- Follow existing patterns: env vars in `ManagementEnv`, `toManagementEnv.ts`, wrangler examples
- Run `pnpm verify` before PR

---

### Task 1: Shared platform KV keys and types

**Files:**
- Create: `packages/shared/src/platform.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/platform.test.ts`

**Interfaces:**
- Produces: `platformStatsKey(): string`, `type PlatformStats = { claimedSites: number }`, `parsePlatformStats(raw: string | null): PlatformStats | null`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared/src/platform.test.ts
import { describe, expect, it } from "vitest";
import { parsePlatformStats, platformStatsKey } from "./platform.js";

describe("platformStatsKey", () => {
  it("returns stable key", () => {
    expect(platformStatsKey()).toBe("platform:stats");
  });
});

describe("parsePlatformStats", () => {
  it("parses valid stats", () => {
    expect(parsePlatformStats(JSON.stringify({ claimedSites: 3 }))).toEqual({
      claimedSites: 3,
    });
  });

  it("rejects invalid payloads", () => {
    expect(parsePlatformStats(null)).toBeNull();
    expect(parsePlatformStats("{}")).toBeNull();
    expect(parsePlatformStats('{"claimedSites":-1}')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @is-in/shared test`
Expected: FAIL — module `./platform.js` not found

- [ ] **Step 3: Implement**

```typescript
// packages/shared/src/platform.ts
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
```

Export from `packages/shared/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @is-in/shared test`
Expected: PASS

---

### Task 2: Capacity config and helpers (management server)

**Files:**
- Create: `apps/management/src/server/platformCapacity.ts`
- Create: `apps/management/src/server/platformCapacity.test.ts`
- Modify: `apps/management/src/server/env.ts`
- Modify: `apps/management/src/server/toManagementEnv.ts`
- Modify: `apps/management/src/env.d.ts`

**Interfaces:**
- Consumes: `platformStatsKey`, `parsePlatformStats`, `PlatformStats` from `@is-in/shared`
- Produces:
  - `parseSignupsEnabled(raw: string | undefined): boolean`
  - `parseMaxClaimedSites(raw: string | undefined): number | null`
  - `readClaimedSiteCount(kv): Promise<number>`
  - `incrementClaimedSiteCount(kv): Promise<number>` (returns new count)
  - `signupsAcceptingClaims(env): boolean`
  - `getPublicCapacity(env, kv): Promise<{ signupsOpen: boolean; maxClaimedSites: number | null; claimedSites: number; remaining: number | null }>`

- [ ] **Step 1: Write failing tests**

Cover:
- `parseMaxClaimedSites("150") === 150`, invalid/empty → `null`
- `parseSignupsEnabled("closed") === "closed"`, default → `"open"`
- `signupsAcceptingClaims` false when sign-ups disabled or count >= cap
- `incrementClaimedSiteCount` from 0 → 1, missing key → 1

Use `createMemoryKv` from `@is-in/shared` in tests.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter management test -- platformCapacity`

- [ ] **Step 3: Implement `platformCapacity.ts`**

```typescript
import {
  parsePlatformStats,
  platformStatsKey,
  type KvStore,
  type PlatformStats,
} from "@is-in/shared";
import type { ManagementEnv } from "./env";

export type SignupsEnabled = boolean;

export function parseSignupsEnabled(raw: string | undefined): SignupsEnabled {
  return raw !== "false";
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

export async function getPublicCapacity(
  env: Pick<ManagementEnv, "SIGNUPS_ENABLED" | "MAX_CLAIMED_SITES">,
  kv: KvStore,
) {
  const claimedSites = await readClaimedSiteCount(kv);
  const maxClaimedSites = parseMaxClaimedSites(env.MAX_CLAIMED_SITES);
  const signupsOpen = signupsAcceptingClaims(env, claimedSites);
  return {
    signupsOpen,
    maxClaimedSites,
    claimedSites,
    remaining: maxClaimedSites === null ? null : Math.max(0, maxClaimedSites - claimedSites),
  };
}
```

Add to `ManagementEnv`:

```typescript
SIGNUPS_ENABLED?: string;
MAX_CLAIMED_SITES?: string;
```

Wire through `toManagementEnv.ts` and `env.d.ts`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter management test -- platformCapacity`

---

### Task 3: Gate claim handler and add capacity API

**Files:**
- Modify: `apps/management/src/server/handlers/sites.ts`
- Create: `apps/management/src/server/handlers/platform.ts`
- Modify: `apps/management/src/server/api/app.ts`
- Modify: `apps/management/src/server/sites.test.ts`

**Interfaces:**
- Consumes: helpers from `./platformCapacity`
- Produces: `GET /api/v1/platform/capacity` → `{ signupsOpen, maxClaimedSites, claimedSites, remaining }`

- [ ] **Step 1: Write failing claim cap tests in `sites.test.ts`**

```typescript
it("rejects claim when signups are closed", async () => {
  test.env.SIGNUPS_ENABLED = "false";
  test.env.MAX_CLAIMED_SITES = "150";
  const sid = await signInViaOtp(test.env, TEST_EMAIL);
  const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
    method: "POST",
    sid,
    body: JSON.stringify({ subdomain: "newsite" }),
  });
  expect(status).toBe(503);
  expect(body?.error).toBe("signups_closed");
});

it("rejects claim when at MAX_CLAIMED_SITES", async () => {
  test.env.MAX_CLAIMED_SITES = "1";
  await test.env.KV.put(platformStatsKey(), JSON.stringify({ claimedSites: 1 }));
  const sid = await signInViaOtp(test.env, OTHER_EMAIL);
  const { status, body } = await callControlPlaneJson(["v1", "sites", "claim"], {
    method: "POST",
    sid,
    body: JSON.stringify({ subdomain: "another" }),
  });
  expect(status).toBe(503);
  expect(body?.error).toBe("signups_closed");
});

it("increments platform stats on successful claim", async () => {
  const sid = await signInViaOtp(test.env, TEST_EMAIL);
  await callControlPlane(["v1", "sites", "claim"], {
    method: "POST",
    sid,
    body: JSON.stringify({ subdomain: TEST_SUB }),
  });
  const raw = await test.env.KV.get(platformStatsKey());
  expect(parsePlatformStats(raw)?.claimedSites).toBe(1);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement claim gate in `postSitesClaim`**

After session auth, before moderation:

```typescript
const claimedSites = await readClaimedSiteCount(store);
if (!signupsAcceptingClaims(env, claimedSites)) {
  return json({ error: "signups_closed" }, 503);
}
```

After successful `store.put` for site + user:

```typescript
await incrementClaimedSiteCount(store);
```

- [ ] **Step 4: Add `getPlatformCapacity` handler and route**

```typescript
// handlers/platform.ts
export const getPlatformCapacity: ControlPlaneHandler = async (_request, env) => {
  const capacity = await getPublicCapacity(env, env.KV);
  return json(capacity);
};
```

Register in `app.ts`:

```typescript
{ method: "GET", pathname: "/api/v1/platform/capacity", handle: getPlatformCapacity },
```

- [ ] **Step 5: Run sites tests — expect PASS**

Run: `pnpm --filter management test -- sites.test`

---

### Task 4: Wrangler vars and README

**Files:**
- Modify: `apps/management/wrangler.toml`
- Modify: `apps/management/wrangler.toml.example`
- Modify: `README.md`

- [ ] **Step 1: Set hosted production vars**

In `apps/management/wrangler.toml` `[vars]`:

```toml
SIGNUPS_ENABLED = "true"
MAX_CLAIMED_SITES = "150"
```

Staging: same values (or lower cap for testing).

Example file: document vars with comment that forks should omit `MAX_CLAIMED_SITES` for unlimited self-host.

- [ ] **Step 2: Update README**

In hosted vs self-host table and a short “Capacity” subsection:

- 150 sign-up slots on hosted `is-in.nz`
- `SIGNUPS_ENABLED=false` to pause
- Workers Paid (~$5/mo) expected at full hosted scale for OTP + future outbound forward
- Link ADR-0007

---

## Messaging (copy spec)

**Voice:** Match `index.astro` — plain, unhurried, no slogans. Skip negative parallelism (“not a waitlist game”) and slogan-like taglines.

**No fixed cap in public copy:** `MAX_CLAIMED_SITES=150` stays in config/ADR only. Do not show `150` or `{max}` on home or claim. On claim, show `{remaining}` only (no denominator) — factual, not ticket-sale framing.

**Home (`/`):** Static only — no capacity API call. Policy copy near “Reserve a subdomain”:

> We open sign-ups in cohorts so we don't outgrow what we can operate reliably. New places open as each cohort fills.

**Claim (`/claim`):** Live state from `GET /api/v1/platform/capacity`. Show `{remaining} places left in this cohort.` whenever sign-ups are open. No progress bar; no `{max}` in strings.

| Condition | Copy |
| --------- | ---- |
| Open | `{remaining} places left in this cohort.` |
| Full (cohort cap reached) | `This cohort is full. The next isn't open yet.` |
| Paused (`SIGNUPS_ENABLED=false`) | `Sign-ups are paused at the moment.` |

Full/paused: disable form; add `Already have a name? Sign in.` (link). Optional muted link to GitHub README for self-host.

**Guest hint** (redirect to sign-in): no count required; keep existing reserve flow copy.

**API errors:** Map `signups_closed` to full/paused strings above; never show raw error codes.

**Do not:** progress bars, “X of 150”, percentage full, countdown, exclamation marks, or repeating the home policy paragraph on claim.

---

### Task 5: Home static line + claim capacity UI

**Files:**
- Modify: `apps/management/src/pages/index.astro`
- Modify: `apps/management/src/pages/claim.astro`

- [ ] **Step 1: Add static cohort copy on home**

In footer, near “Reserve a subdomain”:

```html
<p class="muted">
  We open sign-ups in cohorts so we don't outgrow what we can operate reliably.
  New places open as each cohort fills.
</p>
```

No numeric cap in this copy.

- [ ] **Step 2: Fetch capacity on claim page load**

```typescript
const capRes = await fetch(`${apiBase}/api/v1/platform/capacity`);
const cap = capRes.ok
  ? await readJson<{
      signupsOpen?: boolean;
      maxClaimedSites?: number | null;
      remaining?: number | null;
    }>(capRes)
  : null;
```

- [ ] **Step 3: Render copy per Messaging table**

Implement `formatCapacityLine(cap)` returning the string for the current tier; render in a muted `<p id="capacity">` under the h2. When `!signupsOpen`, disable form and show full/paused copy plus sign-in link.

- [ ] **Step 4: Manual smoke**

Run `pnpm dev:management:pages` — home shows cohort policy copy (no number); `/claim` shows open/full state without `{max}`; at cap, form disabled.

---

## Out of scope (Phase A follow-ups)

- `MAX_UNIQUE_FORWARD_DESTINATIONS` registry on forward PATCH (Task 6 / separate plan)
- `FORWARD_DELIVERY_MODE=outbound` on `email-inbound` (Phase B)
- Site deletion and counter decrement
- Automated Cloudflare destination verification API

## Self-review

| ADR-0007 requirement | Task |
| -------------------- | ---- |
| `MAX_CLAIMED_SITES=150` | Task 2–4 |
| `SIGNUPS_ENABLED` | Task 2–4 |
| Claim gate + `signups_closed` | Task 3 |
| Public UI copy | Task 5 |
| Self-host unlimited (unset cap) | Task 2 parseMax → null |
| Forward registry | Deferred |
| Phase B outbound | Deferred |
