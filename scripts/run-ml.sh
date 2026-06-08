#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/services/ml"
exec "$ROOT/services/ml/.venv/bin/uvicorn" api.main:app --host 0.0.0.0 --port 58123
