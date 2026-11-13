#!/usr/bin/env bash
# One-command local runner for MEGAP Clinic OS (Docker).
# Usage: ./start-local.sh [up|down|restart|logs|status|reset]
set -euo pipefail
cd "$(dirname "$0")"

WEB_URL="http://localhost:3000"
API_URL="http://localhost:4000"

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "Docker is not installed. Install Docker Desktop / Docker Engine first."
docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker and retry."
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  die "Docker Compose is not available."
fi

wait_for() { # url label timeout_seconds
  local url="$1" label="$2" timeout="${3:-300}" waited=0
  printf 'Waiting for %s' "$label"
  until curl -fsS -o /dev/null "$url" 2>/dev/null; do
    sleep 3; waited=$((waited + 3)); printf '.'
    if [ "$waited" -ge "$timeout" ]; then
      printf '\n'; "${DC[@]}" logs --tail=60
      die "$label did not become ready within ${timeout}s (logs above)."
    fi
  done
  printf ' ready\n'
}

up() {
  say "Building and starting containers (first run takes several minutes)"
  "${DC[@]}" up --build -d
  wait_for "$API_URL/api/v1/health" "API" 300 || true
  wait_for "$WEB_URL" "Web" 300
  say "MEGAP Clinic OS is running"
  echo "  Web:      $WEB_URL   (register a clinic at $WEB_URL/register)"
  echo "  API docs: $API_URL/api/docs"
  echo "  Use 'localhost' (not 127.0.0.1). Synthetic data only."
  echo "  Logs: ./start-local.sh logs   Stop: ./start-local.sh down"
}

case "${1:-up}" in
  up) up ;;
  down) "${DC[@]}" down ;;
  restart) "${DC[@]}" down; up ;;
  logs) "${DC[@]}" logs -f --tail=100 ;;
  status) "${DC[@]}" ps ;;
  reset)
    printf 'This DELETES all local database data and generated keys. Type "yes" to continue: '
    read -r answer
    [ "$answer" = "yes" ] || die "Aborted."
    "${DC[@]}" down -v
    up
    ;;
  *) die "Unknown command '$1'. Use: up | down | restart | logs | status | reset" ;;
esac
