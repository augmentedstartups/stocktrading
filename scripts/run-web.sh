#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
NEXT="$WEB/node_modules/next/dist/bin/next"
PNPM="/opt/homebrew/bin/pnpm"
NODE="/opt/homebrew/bin/node"

if [[ ! -f "$WEB/.next/BUILD_ID" ]]; then
  echo "No production build found — building…" >&2
  cd "$ROOT" && "$PNPM" build
fi

cd "$WEB"
exec "$NODE" "$NEXT" start -p 53947
