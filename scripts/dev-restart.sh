#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_PORT="${WEB_PORT:-3000}"
API_PORT="${API_PORT:-4000}"

kill_port() {
  local port="$1"
  local pids=""

  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti:"${port}" 2>/dev/null || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp "sport = :${port}" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u || true)"
  fi

  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill -TERM ${pids} 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -KILL ${pids} 2>/dev/null || true
  fi
}

wait_for_port_free() {
  local port="$1"
  local attempts=20

  for ((i = 1; i <= attempts; i++)); do
    if command -v ss >/dev/null 2>&1; then
      if ! ss -ltn "sport = :${port}" 2>/dev/null | grep -q ":${port}"; then
        return 0
      fi
    elif command -v lsof >/dev/null 2>&1; then
      if ! lsof -ti:"${port}" >/dev/null 2>&1; then
        return 0
      fi
    else
      return 0
    fi
    sleep 0.25
  done

  echo "Port ${port} is still in use after cleanup." >&2
  return 1
}

echo "Stopping dev servers on ports ${WEB_PORT} and ${API_PORT}..."
kill_port "${WEB_PORT}"
kill_port "${API_PORT}"

pkill -f "${ROOT}/apps/web/node_modules/.bin/../next/dist/bin/next dev" 2>/dev/null || true
pkill -f "${ROOT}/apps/api.*tsx watch src/main.ts" 2>/dev/null || true

wait_for_port_free "${WEB_PORT}"
wait_for_port_free "${API_PORT}"

echo "Clearing dev caches..."
rm -rf "${ROOT}/apps/web/.next"
rm -rf "${ROOT}/apps/web/node_modules/.cache"
rm -rf "${ROOT}/apps/api/dist"
rm -rf "${ROOT}/node_modules/.cache"

echo "Starting API and web dev servers..."
cd "${ROOT}"
exec pnpm dev:app
