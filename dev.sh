#!/usr/bin/env bash
set -e

FRONTEND_PORT=53947
ML_PORT=58123
CONTROL_PORT=54827
ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down…"
  kill "$ML_PID" "$CONVEX_PID" "$WEB_PID" "$CONTROL_PID" 2>/dev/null
  wait "$ML_PID" "$CONVEX_PID" "$WEB_PID" "$CONTROL_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "▶ Starting ML backend on port $ML_PORT…"
cd "$ROOT/services/ml"
.venv/bin/uvicorn api.main:app --reload --host 0.0.0.0 --port "$ML_PORT" &
ML_PID=$!

echo "▶ Starting Convex dev sync…"
cd "$ROOT/apps/web"
pnpm convex dev &
CONVEX_PID=$!

echo "▶ Starting Next.js frontend on port $FRONTEND_PORT…"
cd "$ROOT/apps/web"
pnpm exec next dev --turbopack -p "$FRONTEND_PORT" &
WEB_PID=$!

echo "▶ Starting Control API on port $CONTROL_PORT…"
cd "$ROOT"
WEB_URL="http://127.0.0.1:$FRONTEND_PORT" ML_URL="http://127.0.0.1:$ML_PORT" CONTROL_PORT="$CONTROL_PORT" node services/control/server.mjs &
CONTROL_PID=$!

echo ""
echo "  Frontend → http://localhost:$FRONTEND_PORT"
echo "  ML API   → http://localhost:$ML_PORT"
echo "  Control  → http://localhost:$CONTROL_PORT"
echo ""
echo "  Press Ctrl+C to stop all services."

wait
