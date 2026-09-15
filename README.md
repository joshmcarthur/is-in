# Architectural decision records

Settled architecture choices for is-in.nz. Each ADR is a standalone file in this Lore Work (`refs/lore/architectural-decision-records`).

Workflow: [git-lore](https://github.com/joshmcarthur/git-lore) — install the skills, then [use git-lore in your project](https://github.com/joshmcarthur/git-lore#use-git-lore-in-your-project). Read with **read-lore**; add or revise ADRs with **edit-lore**; share with **sync-lore**.

| ADR | Title |
| --- | --- |
| [ADR-0001](ADR-0001-otp-email-service.md) | Numeric OTP via Cloudflare Email Service |
| [ADR-0002](ADR-0002-session-cross-origin.md) | Session cookies and management API placement |
| [ADR-0003](ADR-0003-kv-keyspace-consistency.md) | KV keyspace and write consistency |
| [ADR-0004](ADR-0004-worker-topology-hono.md) | Worker topology — Pages control plane + edge workers |
| [ADR-0005](ADR-0005-inbound-email-forwarding.md) | Inbound email forwarding strategy (MVP) |
| [ADR-0006](ADR-0006-staging-environments.md) | Staging environments (same Cloudflare account) |
| [ADR-0007](ADR-0007-hosted-capacity-and-forwarding-scale.md) | Hosted capacity limits and email forwarding scale |

New ADR: copy [adr-template.md](adr-template.md), assign the next number, record via **edit-lore** on this Work — not under `docs/` in the source tree.
