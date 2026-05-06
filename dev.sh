#!/usr/bin/env bash
set -e

FRONTEND_PORT=53947
ML_PORT=8000
ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down…"
  kill "$ML_PID" "$CONVEX_PID" "$WEB_PID" 2>/dev/null
  wait "$ML_PID" "$CONVEX_PID" "$WEB_PID" 2>/dev/null
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

echo ""
echo "  Frontend → http://localhost:$FRONTEND_PORT"
echo "  ML API   → http://localhost:$ML_PORT"
echo ""
echo "  Press Ctrl+C to stop all services."

wait
