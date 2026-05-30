# ADR-0002: Session cookies and management API placement

- Status: Accepted (revised 2026-05-14)
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: Management plane on `home.is-in.nz`
- Supersedes: Earlier draft that assumed a dedicated `api.*` Worker
- Superseded by:

## Context

The management UI is Astro on `home.is-in.nz` (or `home-staging.is-in.nz`), deployed to **Cloudflare Pages** with **hybrid** output: prerendered HTML plus **Pages Functions** for `/api/*`. Sessions must stay **httpOnly** and **Secure** in production.

## Decision Drivers

- Cookie security (XSS resistance)
- Low operational complexity (fewer hostnames and no CORS for the default path)
- Clear separation between visitor traffic (`*.is-in.nz`) and owner traffic (`home.*`)

## Options Considered

### Option 1: Dedicated API hostname (`api.is-in.nz`) with cross-site cookies

Separate Worker; `SameSite=None` and CORS allowlist.

Pros: clear hostname split. Cons: extra DNS, CORS, and a second deployable.

### Option 2: Same-origin `/api/*` on the Pages project (chosen)

Control-plane JSON lives under `https://home.is-in.nz/api/...` as Astro server routes / Pages Functions. The browser uses **same-origin** `fetch("/api/...", { credentials: "include" })`.

Pros: no CORS for the default app; session cookies can use **`SameSite=Lax`** on the management host; one Pages deploy carries UI + API.

Cons: OTP and KV bindings are configured on the **Pages** `wrangler.toml`, not a tiny standalone Worker.

## Decision

Adopt **Option 2**. Session remains an opaque id in cookie `isin_session`, backed by KV `session:{id}`. Cookie attributes: `Path=/`, `HttpOnly`, `Secure` on production hosts, `SameSite=Lax` (localhost may omit `Secure` during dev).

**Optional:** set `PUBLIC_API_BASE` at build time only if the UI must call an API on a different origin (not the default).

## Consequences

### Positive

- Simpler mental model for the management app

### Negative

- Pages project carries both static assets and privileged API code

## Implementation Notes

- Code: `apps/management/src/server/controlPlane.ts`, `apps/management/src/pages/api/[...segments].ts`
- Secrets: `SESSION_SECRET` via `wrangler secret put` on the Pages project (or `apps/management/.dev.vars` locally)

## Validation

- After sign-in, `GET /api/v1/session/me` returns authenticated without cross-origin configuration.

## References

- [ADR-0004](ADR-0004-worker-topology-hono.md)
- `apps/management/wrangler.toml`
