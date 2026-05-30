# ADR-0005: Inbound email forwarding strategy (MVP)

- Status: Accepted
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: Email forwarding after sign-up
- Supersedes:
- Superseded by:

## Context

Users configure a **forwarding destination** for mail to `*@{site}.is-in.nz`. Cloudflare **Email Routing** can deliver mail based on zone-level rules. Workers can participate via **Email Workers**. MVP must persist intent in **KV** and define how that becomes real mail flow.

## Decision Drivers

- Time to first working forward
- Automation vs manual DNS/operator steps
- Free-tier limits and API complexity

## Options Considered

### Option 1: KV as source of truth + Email Worker per message

Email Worker reads `site` from KV and forwards programmatically.

Pros:

- Maximum flexibility per subdomain

Cons:

- More code and testing around MIME and deliverability

### Option 2: Email Routing rules via Cloudflare API / dashboard

Create catch-all or custom address rules pointing to verified destinations.

Pros:

- Uses managed routing pipeline

Cons:

- API permissions and per-rule limits; coupling to account automation

### Option 3: MVP persistence + operator-runbook (chosen baseline)

Persist `emailForwardDest` on `site:{subdomain}` via control API. **Automated creation of Email Routing rules is not required for the first merge** if undocumented API surface blocks progress; instead document the **exact** dashboard/API steps and verify one subdomain manually in staging.

Pros:

- Ships data model and UI quickly; defers risky automation

Cons:

- Not fully self-serve for email until follow-up

## Decision

Adopt **Option 3** with storage and validation in the control API now; treat **Option 1** as the likely next increment for true self-serve, followed by **Option 2** if rule automation is preferred. This ADR should be updated when automation lands.

## Implementation Notes

- Validate destination as a normalised RFC-like email string; block obviously invalid hosts.
- UI copy: “Forwarding destination saved — complete Email Routing for your subdomain if not already automated.”

## Validation

- KV contains destination after PATCH
- Staging checklist documents a successful forward test path

## References

- https://developers.cloudflare.com/email-routing/
- `apps/management` PATCH `/api/v1/sites/.../forwarding`; runtime delivery via **`workers/email-inbound`** (Email Worker) plus zone Email Routing
