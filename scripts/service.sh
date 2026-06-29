#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
AGENT_DIR="$HOME/Library/LaunchAgents"
PLIST_DIR="$ROOT/scripts/launchd"
UID_NUM="$(id -u)"
DOMAIN="gui/$UID_NUM"

ML_PORT=58123
WEB_PORT=53947
CONTROL_PORT=54827

AGENTS=(com.stocktrading.ml com.stocktrading.web com.stocktrading.control)

agent_plist() {
  echo "$AGENT_DIR/$1.plist"
}

unload_agent() {
  local label="$1"
  local dest
  dest="$(agent_plist "$label")"
  launchctl bootout "$DOMAIN" "$dest" 2>/dev/null || true
}

load_agent() {
  local label="$1"
  local src="$PLIST_DIR/$label.plist"
  local dest
  dest="$(agent_plist "$label")"
  cp "$src" "$dest"
  launchctl bootstrap "$DOMAIN" "$dest"
}

remove_login_item() {
  osascript <<EOF 2>/dev/null || true
tell application "System Events"
  repeat with li in login items
    if path of li is "$ROOT/scripts/background-start.sh" then delete li
  end repeat
end tell
EOF
}

cmd_install() {
  mkdir -p "$LOG_DIR" "$AGENT_DIR"
  chmod +x "$ROOT/scripts/"*.sh

  echo "Building web app…"
  cd "$ROOT" && pnpm build

  echo "Stopping any existing services…"
  cmd_uninstall 2>/dev/null || true
  bash "$ROOT/scripts/background-stop.sh" 2>/dev/null || true
  remove_login_item

  echo "Installing LaunchAgents (start on login, auto-restart)…"
  for label in "${AGENTS[@]}"; do
    load_agent "$label"
    echo "  ✓ $label"
  done

  echo ""
  echo "Waiting for services to come up…"
  sleep 4
  cmd_status

  echo ""
  echo "Installed. Services survive terminal/Cursor close and restart on login."
  echo "  Frontend → http://localhost:$WEB_PORT"
  echo "  ML API   → http://localhost:$ML_PORT"
  echo "  Control  → http://localhost:$CONTROL_PORT"
  echo "  Logs     → $LOG_DIR/com.stocktrading.*.log"
}

cmd_uninstall() {
  remove_login_item
  for label in "${AGENTS[@]}"; do
    unload_agent "$label"
    rm -f "$(agent_plist "$label")"
  done
  bash "$ROOT/scripts/background-stop.sh" 2>/dev/null || true
  echo "LaunchAgents removed."
}

cmd_restart() {
  cmd_uninstall
  sleep 1
  for label in "${AGENTS[@]}"; do
    load_agent "$label"
  done
  sleep 3
  cmd_status
}

cmd_status() {
  echo "LaunchAgents:"
  for label in "${AGENTS[@]}"; do
    if launchctl print "$DOMAIN/$label" &>/dev/null; then
      state="$(launchctl print "$DOMAIN/$label" 2>/dev/null | awk -F'= ' '/state =/{print $2; exit}')"
      echo "  ✓ $label (${state:-loaded})"
    else
      echo "  ✗ $label not loaded"
    fi
  done
  echo ""
  curl -sf "http://127.0.0.1:$WEB_PORT/watchlist" >/dev/null \
    && echo "✓ Frontend http://127.0.0.1:$WEB_PORT" \
    || echo "✗ Frontend unreachable"
  curl -sf "http://127.0.0.1:$ML_PORT/health" >/dev/null \
    && echo "✓ ML http://127.0.0.1:$ML_PORT" \
    || echo "✗ ML unreachable"
  curl -sf "http://127.0.0.1:$CONTROL_PORT/health" >/dev/null \
    && echo "✓ Control http://127.0.0.1:$CONTROL_PORT" \
    || echo "✗ Control unreachable"
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
