# Development

## Quality checks

Run before opening a pull request:

```bash
pnpm verify && pnpm audit --audit-level=high
```

`pnpm verify` runs Biome (`lint`), TypeScript checks across workspaces (`typecheck`), and Vitest (`test`). GitHub Actions CI runs those same checks **plus** the audit; local `pnpm verify` does not include it.

Workspaces pin TypeScript to `~6.0.3` (`pnpm.overrides` keep it `>=6.0.3 <7`) because TypeScript 7 is the native compiler and does not export the Language Service API that `astro check` needs. Dependabot ignores TypeScript majors and excludes `typescript` from the grouped `dev-dependencies` update. CI and local tooling use Node 24 so `URLPattern` is available to management tests (Workers already have it).

`pnpm.overrides` also force patched transitives, including `sharp >=0.35.4`. [GHSA-26w7-cxv4-gfx2](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) is keyed to `astro < 7.2.8` but the actual bug is Sharp/`libheif`; there is no Astro 6 backport, so that advisory is listed in `pnpm.auditConfig.ignoreGhsas` until we take Astro 7.

Individual commands:

| Command | Purpose |
|---------|---------|
| `pnpm lint` | Lint and format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint and format issues |
| `pnpm typecheck` | `tsc` / `astro check` per package |
| `pnpm test` | All Vitest projects |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm --filter @is-in/shared test` | Tests for one workspace |

CI also runs [Gitleaks](https://github.com/gitleaks/gitleaks) for secret scanning.

## Tooling

- **Biome** — linting and formatting for TypeScript, JSON, Markdown, and Astro frontmatter. Use the [Biome VS Code extension](https://biomejs.dev/reference/vscode/) with format-on-save.
- **Vitest** — unit tests for `@is-in/shared` and management server modules (`*.test.ts` colocated with source); control-plane tests use `routeApi` + in-memory KV helpers in `apps/management/src/server/testing/`; `@cloudflare/vitest-pool-workers` for the `public-site` and `email-inbound` workers.

## Tests for new work

Add or extend tests when changing:

- Subdomain and email validation (`packages/shared`, `apps/management/src/server/validate.ts`)
- OTP, session, or forwarding security behaviour
- Worker routing (redirects, inbound email parsing)

Management API tests exercise `routeApi` with an in-memory KV mock (`controlPlane.test.ts`, `availability.test.ts`, `otp.test.ts`, `session.test.ts`, `sites.test.ts`, and helpers in `src/server/testing/`). They do not run Astro or Wrangler Pages; the `public-site` and `email-inbound` workers use the Cloudflare Vitest pool instead.

Forks should copy `wrangler.toml.example` in `apps/management`, `workers/public-site`, and `workers/email-inbound` before deploy. See the README self-host section.

## Optional later

- [CodeQL](https://codeql.github.com/) for additional static security analysis
- [OSV-Scanner](https://google.github.io/osv-scanner/) alongside `pnpm audit`
- [knip](https://knip.dev/) for unused dependencies (noisy in small repos)
