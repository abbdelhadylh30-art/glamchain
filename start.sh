#!/usr/bin/env bash
# ============================================================================
# GlamChain monorepo — one-command startup
#
# Starts:
#   1. Dashboard app  → http://localhost:3001  (NextAuth + API + Prisma)
#   2. Landing page    → http://localhost:3002  (marketing + booking widget)
#
# Optional: pass `widget` as the only arg to ALSO start the standalone HTML
# widget on port 8000:
#   ./start.sh widget
# (it just runs `python3 -m http.server 8000` in the widget/ folder)
#
# Requires: bun (https://bun.sh) and python3 (for the widget, optional).
# ============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$ROOT/dashboard"
LANDING_DIR="$ROOT/landing"
WIDGET_DIR="$ROOT/widget"

# Colors for nicer output
GREEN=$'\033[1;32m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[1;36m'
RED=$'\033[1;31m'
RESET=$'\033[0m'

echo "${CYAN}════════════════════════════════════════════════════════════════${RESET}"
echo "${CYAN}  GlamChain monorepo — starting up${RESET}"
echo "${CYAN}════════════════════════════════════════════════════════════════${RESET}"

# --- Preflight checks ------------------------------------------------------
command -v bun >/dev/null 2>&1 || {
  echo "${RED}✘ bun is not installed. Install from https://bun.sh${RESET}"
  exit 1
}

# --- 1. Dashboard -----------------------------------------------------------
echo
echo "${GREEN}▶ [1/3] Dashboard app (port 3001)${RESET}"

cd "$DASHBOARD_DIR"

# Install deps if missing
if [ ! -d node_modules ]; then
  echo "${YELLOW}  Installing dashboard dependencies (first run only)...${RESET}"
  bun install
fi

# Generate Prisma client (idempotent)
echo "${YELLOW}  Generating Prisma client...${RESET}"
bun run db:generate >/dev/null 2>&1 || true

# Push schema (creates dev.db if missing)
if [ ! -f prisma/dev.db ]; then
  echo "${YELLOW}  Creating SQLite database (first run only)...${RESET}"
  bun run db:push
  echo "${YELLOW}  Seeding demo data...${RESET}"
  bun run db:seed
else
  echo "${YELLOW}  Ensuring SQLite schema is up to date...${RESET}"
  bun run db:push >/dev/null 2>&1 || true
fi

# Start dev server in background
echo "${GREEN}  Starting Next.js dev server on :3001...${RESET}"
( cd "$DASHBOARD_DIR" && bun run dev > "$ROOT/dashboard.log" 2>&1 ) &
DASHBOARD_PID=$!
echo "  Dashboard PID: $DASHBOARD_PID"

# --- 2. Landing page --------------------------------------------------------
echo
echo "${GREEN}▶ [2/3] Landing page (port 3002)${RESET}"

cd "$LANDING_DIR"

if [ ! -d node_modules ]; then
  echo "${YELLOW}  Installing landing dependencies (first run only)...${RESET}"
  bun install
fi

echo "${GREEN}  Starting Next.js dev server on :3002...${RESET}"
( cd "$LANDING_DIR" && bun run dev > "$ROOT/landing.log" 2>&1 ) &
LANDING_PID=$!
echo "  Landing PID: $LANDING_PID"

# --- 3. (optional) Widget --------------------------------------------------
WIDGET_PID=""
if [ "${1:-}" = "widget" ]; then
  echo
  echo "${GREEN}▶ [3/3] Standalone HTML widget (port 8000)${RESET}"
  command -v python3 >/dev/null 2>&1 || {
    echo "${RED}  ✘ python3 is required for the widget dev server${RESET}"
  }
  ( cd "$WIDGET_DIR" && python3 -m http.server 8000 > "$ROOT/widget.log" 2>&1 ) &
  WIDGET_PID=$!
  echo "  Widget PID: $WIDGET_PID"
fi

# --- Wait + open ------------------------------------------------------------
echo
echo "${CYAN}════════════════════════════════════════════════════════════════${RESET}"
echo "${GREEN}✓ All apps starting.${RESET}"
echo
echo "  Dashboard : ${CYAN}http://localhost:3001${RESET}  (login: admin@glamchain.com / password123)"
echo "  Landing   : ${CYAN}http://localhost:3002${RESET}  (marketing page + booking widget)"
if [ -n "$WIDGET_PID" ]; then
  echo "  Widget    : ${CYAN}http://localhost:8000/booking-widget.html${RESET}"
fi
echo
echo "  Logs: dashboard.log, landing.log${WIDGET_PID:+, widget.log}"
echo
echo "${YELLOW}  Press Ctrl-C to stop all apps.${RESET}"
echo "${CYAN}════════════════════════════════════════════════════════════════${RESET}"

# Try to open the landing page in the user's default browser (best effort)
if command -v xdg-open >/dev/null 2>&1; then
  ( sleep 2 && xdg-open http://localhost:3002 >/dev/null 2>&1 ) &
elif command -v open >/dev/null 2>&1; then
  ( sleep 2 && open http://localhost:3002 >/dev/null 2>&1 ) &
fi

# --- Cleanup on Ctrl-C ------------------------------------------------------
cleanup() {
  echo
  echo "${YELLOW}Stopping apps...${RESET}"
  [ -n "$DASHBOARD_PID" ] && kill "$DASHBOARD_PID" 2>/dev/null && echo "  Stopped dashboard ($DASHBOARD_PID)"
  [ -n "$LANDING_PID" ]    && kill "$LANDING_PID"    2>/dev/null && echo "  Stopped landing ($LANDING_PID)"
  [ -n "$WIDGET_PID" ]     && kill "$WIDGET_PID"     2>/dev/null && echo "  Stopped widget ($WIDGET_PID)"
  # Kill any orphaned child processes (next dev spawns workers)
  pkill -P "$DASHBOARD_PID" 2>/dev/null || true
  pkill -P "$LANDING_PID"    2>/dev/null || true
  [ -n "$WIDGET_PID" ] && pkill -P "$WIDGET_PID" 2>/dev/null || true
  echo "${GREEN}Done.${RESET}"
}
trap cleanup EXIT INT TERM

# Wait for everything to finish (i.e. until the user hits Ctrl-C)
wait
