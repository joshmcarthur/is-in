#!/usr/bin/env bash
# Deploy management to production (alias for deploy-management.sh).
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/deploy-management.sh" production
