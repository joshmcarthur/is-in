# ADR-0005: Inbound email forwarding strategy (MVP)

- Status: Accepted (revised 2026-09-11)
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: Email forwarding after sign-up
- Supersedes:
- Superseded by:

## Context

Users configure forwarding for mail to `*@{site}.is-in.nz`. Cloudflare **Email Routing** delivers inbound mail to **Email Workers**. MVP must persist intent in **KV** and define how that becomes real mail flow.

## Decision Drivers

- Time to first working forward
- Self-serve vs operator steps
- Free-tier limits and API complexity

## Options Considered

### Option 1: KV as source of truth + Email Worker per message (shipped)

Email Worker reads `site:{sub}` from KV, resolves `emailAliases` (exact local, then catch-all `"*"`), and forwards to all configured destinations.

Pros:

- Maximum flexibility per subdomain
- One zone **catch-all** Email Routing rule covers every claimed name

Cons:

- Forward targets must be **verified destinations** in the operator's Cloudflare account

### Option 2: Email Routing rules via Cloudflare API / dashboard

Create catch-all or custom address rules pointing to verified destinations per user.

Pros:

- Uses managed routing pipeline

Cons:

- API permissions and per-rule limits; poor fit for multi-tenant self-serve

### Option 3: MVP persistence + operator-runbook only

Persist destination in KV but require manual per-subdomain routing.

Cons:

- Does not scale; superseded by Option 1 for runtime delivery

## Decision

Adopt **Option 1** for runtime delivery. The control API stores catch-all and per-alias rules in `emailAliases` on `site:{subdomain}`. Operators wire **one catch-all** Email Routing rule → `email-inbound`. Remaining operator work is **destination verification**, not per-subdomain routing tables.

## Implementation Notes

- Validate destinations as normalised email strings at write time.
- Dashboard PATCH `/forwarding` maps to `emailAliases["*"]` for MVP convenience.
- Inbound worker logs structured drop reasons (`no_site`, `no_alias`, `invalid_recipient`).

## Validation

- KV contains alias map after PATCH
- Staging: catch-all rule → worker; mail to `x@you.test.is-in.nz` forwards when alias and verified destination exist

## References

- https://developers.cloudflare.com/email-routing/
- `workers/email-inbound`; management PATCH `/api/v1/sites/.../forwarding`
