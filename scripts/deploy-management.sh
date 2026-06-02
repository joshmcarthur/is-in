#!/usr/bin/env bash
# Build and deploy the management Worker (Astro UI + /api).
# Usage: deploy-management.sh [production|staging]
set -euo pipefail

target="${1:-production}"
root="$(cd "$(dirname "$0")/.." && pwd)"
mgmt="${root}/apps/management"

case "${target}" in
  staging)
    export CLOUDFLARE_ENV=staging
    export PUBLIC_ROOT_DOMAIN=test.is-in.nz
    export PUBLIC_SITE_URL=https://test.is-in.nz
    ;;
  production)
    unset CLOUDFLARE_ENV
    export PUBLIC_ROOT_DOMAIN=is-in.nz
    export PUBLIC_SITE_URL=https://home.is-in.nz
    ;;
  *)
    echo "Unknown target: ${target} (use production or staging)" >&2
    exit 1
    ;;
esac

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
if [ -n "${CLOUDFLARE_ENV:-}" ]; then
  export CLOUDFLARE_ENV
fi
exec pnpm exec wrangler deploy
