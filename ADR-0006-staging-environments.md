# ADR-0006: Staging environments (same Cloudflare account)

- Status: Accepted
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: Multi-stage deployment
- Supersedes:
- Superseded by:

## Context

We need safe iteration before production changes. Constraint: **single Cloudflare account**, separate **KV** data, and distinct **hostnames** for management where useful (UI and `/api` share the Pages deployment).

## Decision Drivers

- Data isolation (no staging wiping production KV)
- Parity between staging and prod configs
- Low operator overhead

## Options Considered

### Option 1: Separate Cloudflare accounts

Maximum isolation.

Cons:

- Duplicated DNS and billing; rejected for now

### Option 2: Wrangler environments + separate KV namespaces (chosen)

`[env.staging]` in each Wrangler file with its own `kv_namespaces` binding id placeholders. Operators create real IDs and fill via CI secrets or local overrides.

Pros:

- Matches user preference; one dashboard

Cons:

- Requires discipline to never point staging Workers at prod KV IDs

## Decision

Use **Option 2**. Each deployable (`apps/management` Pages, `workers/public-site`, `workers/email-inbound`) defines `default` (production) and `staging` envs. Secrets (`SESSION_SECRET`, etc.) differ per env.

**Hostnames (illustrative):**

| Environment | Management (Pages: UI + `/api/*`) | Edge workers |
|-------------|-------------------------------------|----------------|
| Production | `home.is-in.nz` | `public-site`, `email-inbound` (prod KV) |
| Staging | `test.is-in.nz` (dashboard + `/api`) | `*.test.is-in.nz` → staging workers + **staging KV** |

`PUBLIC_API_BASE` is optional; leave unset for same-origin `/api` on the management hostname.

**Pages:** use branch previews optionally; named staging uses a dedicated Pages environment or project variable wiring to staging API base URL.

## Implementation Notes

- Document placeholder KV IDs in README; real IDs stay out of git or use `.dev.vars` locally.
- Wildcard `*.is-in.nz` routing: staging may share production zone with separate worker route patterns only if DNS allows—otherwise use `workers.dev` URLs for early integration (documented).

## Validation

- `wrangler deploy -e staging` targets staging KV only
- Smoke test: create site in staging does not appear in prod KV

## References

- `apps/management/wrangler.toml`, `workers/public-site/wrangler.toml`, `workers/email-inbound/wrangler.toml`, README deployment section
