# ADR-0004: Worker topology — Pages control plane + edge workers

- Status: Accepted (revised 2026-05-14)
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: Reserve-address MVP architecture
- Supersedes: Prior “Hono control API Worker” topology
- Superseded by:

## Context

We want the **control plane** (auth, reservation, forwarding fields) colocated with the **Astro management UI** to reduce moving parts. Visitor and mail edge behaviour stay in **small dedicated Workers** with narrow bindings.

## Decision Drivers

- Few deployables for operators to reason about
- Blast radius: public redirect and inbound mail must not ship with dashboard code
- Free-tier request counts (small Worker scripts)

## Options Considered

### Option 1: Three HTTP Workers (control + public + optional)

Maximum separation; three Wrangler projects.

Cons: control plane separated from Astro (what we moved away from).

### Option 2: Pages (Astro hybrid) + `public-site` + `email-inbound` (chosen)

1. **`apps/management`** — Astro **hybrid** on Cloudflare Pages: prerendered pages + `/api/*` Pages Functions implementing the former control API (KV + `send_email` for OTP).
2. **`workers/public-site`** — Hono (or plain fetch handler) for `https://{site}.is-in.nz` HTTP redirects from KV.
3. **`workers/email-inbound`** — **Email Worker** entrypoint: reads `emailForwardDest` from KV for `*@{site}.is-in.nz` and `message.forward(...)`. Attach via zone **Email Routing** to the addresses you want handled dynamically.

Shared **`packages/shared`** key helpers and types.

## Decision

Adopt **Option 2**.

**Out of scope:** Merging `public-site` and `email-inbound` (different Worker entry types and triggers).

## Implementation Notes

- Pages bindings: `apps/management/wrangler.toml` (`KV`, `send_email`, vars, secrets).
- Public worker binds **KV** only; email-inbound binds **KV** only.
- Email Worker must be wired in the Cloudflare dashboard (Email Routing → route → Worker) after deploy.

## Validation

- Deploy Pages; confirm `/api/health` returns JSON from production.
- Deploy `public-site`; confirm apex `home` is not captured by the wildcard worker route.
- Deploy `email-inbound`; send test mail to `anything@test.is-in.nz` and confirm forward when KV has `emailForwardDest`.

## References

- `apps/management`, `workers/public-site`, `workers/email-inbound`
- [ADR-0002](ADR-0002-session-cross-origin.md), [ADR-0005](ADR-0005-inbound-email-forwarding.md)
