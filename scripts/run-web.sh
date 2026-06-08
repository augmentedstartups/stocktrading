#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/web"
exec /opt/homebrew/bin/node "$ROOT/apps/web/node_modules/next/dist/bin/next" start -p 53947
