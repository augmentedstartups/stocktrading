#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export WEB_URL="http://127.0.0.1:53947"
export ML_URL="http://127.0.0.1:58123"
export CONTROL_PORT="54827"
exec /opt/homebrew/bin/node "$ROOT/services/control/server.mjs"
