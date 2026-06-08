#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.run"
LOG_DIR="$ROOT/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"

start_one() {
  local name="$1"
  local runner="$2"
  local pidfile="$RUN_DIR/$name.pid"
  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    return
  fi
  nohup /bin/bash "$runner" >>"$LOG_DIR/$name.log" 2>>"$LOG_DIR/$name.err.log" &
  echo $! >"$pidfile"
}

start_one ml "$ROOT/scripts/run-ml.sh"
start_one web "$ROOT/scripts/run-web.sh"
start_one control "$ROOT/scripts/run-control.sh"
