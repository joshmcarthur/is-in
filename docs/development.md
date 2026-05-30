# Development

## Quality checks

Run before opening a pull request:

```bash
pnpm verify
```

This runs Biome (`lint`), TypeScript checks across workspaces (`typecheck`), and Vitest (`test`).

Individual commands:

| Command | Purpose |
|---------|---------|
| `pnpm lint` | Lint and format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint and format issues |
| `pnpm typecheck` | `tsc` / `astro check` per package |
| `pnpm test` | All Vitest projects |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm --filter @is-in/shared test` | Tests for one workspace |

CI also runs `pnpm audit --audit-level=high` and [Gitleaks](https://github.com/gitleaks/gitleaks) for secret scanning.

## Tooling

- **Biome** — linting and formatting for TypeScript, JSON, Markdown, and Astro frontmatter. Use the [Biome VS Code extension](https://biomejs.dev/reference/vscode/) with format-on-save.
- **Vitest** — unit tests for `@is-in/shared` and management server modules (`*.test.ts` colocated with source); control-plane tests use `routeControlPlane` + in-memory KV helpers in `apps/management/src/server/testing/`; `@cloudflare/vitest-pool-workers` for the `public-site` worker.

## Tests for new work

Add or extend tests when changing:

- Subdomain and email validation (`packages/shared`, `apps/management/src/server/validate.ts`)
- OTP, session, or forwarding security behaviour
- Worker routing (redirects, inbound email parsing)

Management API tests exercise `routeControlPlane` with an in-memory KV mock (`controlPlane.test.ts`, `availability.test.ts`, `otp.test.ts`, `session.test.ts`, `sites.test.ts`, and helpers in `src/server/testing/`). They do not run Astro or Wrangler Pages; the `public-site` worker uses the Cloudflare Vitest pool instead.

## Optional later

- [CodeQL](https://codeql.github.com/) for additional static security analysis
- [OSV-Scanner](https://google.github.io/osv-scanner/) alongside `pnpm audit`
- [knip](https://knip.dev/) for unused dependencies (noisy in small repos)
