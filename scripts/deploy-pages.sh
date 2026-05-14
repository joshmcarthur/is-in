#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "${root}/.pages-deploy"
mkdir -p "${root}/.pages-deploy"
cp "${root}/index.html" "${root}/.pages-deploy/"
exec npx --yes wrangler@latest pages deploy "${root}/.pages-deploy" --project-name="${CLOUDFLARE_PAGES_PROJECT_NAME:-is-in}"
