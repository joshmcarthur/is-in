# ADR-0001: Numeric OTP via Cloudflare Email Service

- Status: Accepted
- Date: 2026-05-14
- Deciders: Project maintainers
- Technical Story: [docs/init/PLAN.md](../init/PLAN.md) (auth section)
- Supersedes: Magic-link-only wording in product brief for MVP onboarding
- Superseded by:

## Context

The product brief describes passwordless email authentication using **magic links**. The reserve-address milestone requires **numeric codes emailed** instead, while staying Cloudflare-first and optimising for the free tier. Outbound mail must work from Workers without introducing a third-party dependency until Cloudflare-native options are ruled out.

## Decision Drivers

- Deliverability and operational simplicity on Cloudflare
- Cost and quota fit for low-volume OTP
- Security (short TTL, rate limits, no plaintext OTP storage)
- Ability to swap providers behind a narrow interface if needed

## Options Considered

### Option 1: Magic link (signed URL)

Single-click login; no code entry. Familiar from the original brief.

Pros:

- Excellent UX; fewer user errors

Cons:

- Does not match the reserve-address milestone requirement for numeric codes
- Link tokens in email logs and referrer leakage need careful handling

### Option 2: Numeric OTP via Cloudflare Email Service (Workers `send_email` binding)

Send short-lived codes using the [Workers send API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).

Pros:

- Native binding; no extra vendor account for MVP
- Clear error surface (`E_SENDER_NOT_VERIFIED`, rate and daily limits)

Cons:

- Requires domain onboarding and verification for the sender
- Quotas must be validated against expected traffic

### Option 3: Third-party transactional API (HTTP from Worker)

Call Resend, Postmark, etc., with an API token.

Pros:

- Mature dashboards and templates

Cons:

- Extra secret and vendor; deprioritised until Option 2 is blocked

## Decision

Adopt **Option 2** as the primary path for OTP email, with **Option 3** documented only as a fallback if Email Service onboarding or quotas block production use.

**In scope:** 6-digit (or similar) codes, hashed at rest with a server secret, TTL ~10 minutes, attempt caps, generic responses to avoid email enumeration.

**Out of scope:** SMS OTP, TOTP apps, password authentication.

## Consequences

### Positive

- Aligns implementation with “Cloudflare-first”
- Small `Mailer` abstraction allows fallback without rewiring routes

### Negative

- Operators must complete Email Service domain setup before OTP works in production

### Neutral

- Product copy in `docs/init/PLAN.md` should reference this ADR for the MVP auth mechanism

## Implementation Notes

- Configure `send_email` in Wrangler; restrict `allowed_sender_addresses` in production where practical.
- Hash OTP with HMAC-SHA256 (or equivalent) using `OTP_PEPPER` or shared `SESSION_SECRET`; compare in constant time.
- Log message IDs only for support, not OTP values.

## Validation

- Staging: successful send to a test inbox after sender verification
- Unit tests for hash verification and expiry behaviour (where testable without binding)

## References

- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- `apps/management` Pages Functions (`src/server/controlPlane.ts`)
