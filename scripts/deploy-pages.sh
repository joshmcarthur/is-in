#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
mgmt="${root}/apps/management"
(
  cd "${root}"
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm is required (see README)." >&2
    exit 1
  fi
  pnpm install
  pnpm build:management
)
cd "${mgmt}"
exec npx --yes wrangler@latest pages deploy dist --project-name="${CLOUDFLARE_PAGES_PROJECT_NAME:-is-in}"
