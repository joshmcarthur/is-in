# Plan

## Objective

Ship Phase A hosted capacity controls: cohort-based sign-up limits (150 sites in config), claim gating, capacity API, and claim/home messaging — without committing new ADRs/plans to the repo tree (this Work lives in Lore).

## Scope

**In:** `MAX_CLAIMED_SITES`, `SIGNUPS_MODE`, KV `platform:stats` counter, claim gate, `GET /api/v1/platform/capacity`, home + claim copy.

**Out (follow-ups):** forward-destination registry, `FORWARD_DELIVERY_MODE=outbound` (Phase B), site deletion / counter decrement.

## Messaging (decided)

- **Home (static):** We open sign-ups in cohorts so we don't outgrow what we can operate reliably. New places open as each cohort fills.
- **Claim (live):** `{remaining} places left in this cohort.` while open; no public `{max}` or `150`.
- **Full:** This cohort is full. The next isn't open yet.
- **Paused:** Sign-ups are paused at the moment.

## Next steps

1. Implement Phase A per `spec.md` (Tasks 1–5).
2. Operator README note for capacity vars (not a new ADR in repo).
3. Phase B when cohort fills: Workers Paid + outbound forward on `email-inbound`.
