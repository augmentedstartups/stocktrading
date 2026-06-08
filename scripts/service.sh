#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
LOGIN_ITEM_NAME="StockTrading Council"

ML_PORT=58123
WEB_PORT=53947
CONTROL_PORT=54827

cmd_install() {
  mkdir -p "$LOG_DIR"
  chmod +x "$ROOT/scripts/"*.sh

  echo "Building web app (one-time)…"
  cd "$ROOT" && pnpm build

  bash "$ROOT/scripts/background-stop.sh" 2>/dev/null || true
  bash "$ROOT/scripts/background-start.sh"

  osascript <<EOF
tell application "System Events"
  repeat with li in login items
    if path of li is "$ROOT/scripts/background-start.sh" then delete li
  end repeat
  make login item at end with properties {path:"$ROOT/scripts/background-start.sh", hidden:true}
end tell
EOF

  echo ""
  echo "Background services installed and started."
  echo "  Frontend → http://localhost:$WEB_PORT"
  echo "  ML API   → http://localhost:$ML_PORT"
  echo "  Control  → http://localhost:$CONTROL_PORT"
  echo "  Logs     → $LOG_DIR"
  echo ""
  echo "They survive terminal/Cursor close and restart on login."
}

cmd_uninstall() {
  osascript <<EOF
tell application "System Events"
  repeat with li in login items
    if path of li is "$ROOT/scripts/background-start.sh" then delete li
  end repeat
end tell
EOF
  bash "$ROOT/scripts/background-stop.sh"
  echo "Background services removed."
}

cmd_restart() {
  bash "$ROOT/scripts/background-stop.sh"
  bash "$ROOT/scripts/background-start.sh"
  echo "Services restarted."
}

cmd_status() {
  for name in ml web control; do
    pidfile="$ROOT/.run/$name.pid"
    if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      echo "✓ $name running (pid $(cat "$pidfile"))"
    else
      echo "✗ $name not running"
    fi
  done
  echo ""
  curl -sf "http://127.0.0.1:$WEB_PORT/" >/dev/null && echo "✓ Frontend http://127.0.0.1:$WEB_PORT" || echo "✗ Frontend unreachable"
  curl -sf "http://127.0.0.1:$ML_PORT/health" >/dev/null && echo "✓ ML http://127.0.0.1:$ML_PORT" || echo "✗ ML unreachable"
  curl -sf "http://127.0.0.1:$CONTROL_PORT/health" >/dev/null && echo "✓ Control http://127.0.0.1:$CONTROL_PORT" || echo "✗ Control unreachable"
}

case "${1:-}" in
  install) cmd_install ;;
  uninstall) cmd_uninstall ;;
  restart) cmd_restart ;;
  status) cmd_status ;;
  *)
    echo "Usage: $0 {install|uninstall|restart|status}"
    exit 1
    ;;
esac
