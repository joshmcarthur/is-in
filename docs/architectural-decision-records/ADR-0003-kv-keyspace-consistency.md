# ADR-0003: KV keyspace and write consistency

- Status: Accepted
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: Reserve-address and onboarding
- Supersedes:
- Superseded by:

## Context

All durable state for MVP onboarding lives in **Cloudflare KV**. We need predictable keys for **sites** (subdomains), **users** (email), **OTP** state, and **sessions**, plus rules for **reserved** names. KV is **eventually consistent** and lacks multi-key transactions.

## Decision Drivers

- Fast availability checks (minimal reads)
- Clear ownership: site → owner email; user → list of sites
- Abuse resistance (reserved names, validation)
- Simple mental model for operators inspecting KV

## Options Considered

### Option 1: Site-primary only

Store everything under `site:{slug}`; scan users by email impractical.

Pros:

- Fewest keys per read for public redirect path

Cons:

- Listing “my sites” for a user requires secondary index or scan

### Option 2: Site + user secondary index (chosen pattern)

Maintain `site:{subdomain}` and `user:{canonicalEmail}` in parallel on claim and on destructive updates.

Pros:

- O(1) availability check on `site:{subdomain}`
- O(1) user profile read for `user:{email}`

Cons:

- Claim and release must update two keys (tolerate rare inconsistency with documented repair)

### Option 3: D1 relational store

Pros:

- Transactions and queries

Cons:

- Out of scope for this milestone; revisit if ownership rules become relational

## Decision

Adopt **Option 2** with the following key conventions (string prefixes):

| Key | Purpose |
|-----|---------|
| `site:{subdomain}` | JSON: owner email, forwarding fields, timestamps |
| `user:{canonicalEmail}` | JSON: `{ "sites": string[] }` |
| `otp:{canonicalEmail}` | JSON: `{ "hash", "exp", "attempts" }` |
| `session:{id}` | JSON: `{ "email", "exp" }` |
| `ratelimit:{scope}:{bucket}` | Optional counters with TTL for coarse limits |

**Reserved subdomains:** enforced in Worker code (static list) merged with optional future KV blocklist. Initial reserved set includes: `www`, `home`, `api`, `mail`, `smtp`, `ftp`, `admin`, `root`, `is-in`, `staging`, `dev`, `test`, `_dmarc`, `status`.

**Canonical email:** lowercased local part + `@` + lowercased punycode domain where applicable.

**In scope:** single-user single-site claim for MVP (claim rejects if user already has a site unless extended later).

**Out of scope:** multi-site per user in product UI (data model allows array for forward compatibility).

## Consequences

### Positive

- Public worker hot path reads one KV key

### Negative

- Claim must write two keys; partial failure can orphan—mitigate by ordered writes and idempotent retry (prefer writing `site` then `user`, and on retry merge user sites array)

### Neutral

- Future D1 migration can import these keys

## Implementation Notes

- Store JSON as UTF-8 strings; version field optional for migrations.
- Subdomain validation: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$` (lowercase before storage).

## Validation

- Integration test or manual script: claim → both keys exist; availability becomes false
- Reserved names never return available

## References

- `packages/shared` key helpers and types
- `apps/management` API routes and `src/server/controlPlane.ts`
