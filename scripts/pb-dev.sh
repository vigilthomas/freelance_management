#!/usr/bin/env bash
# Runs PocketBase natively for development on 127.0.0.1:8090 (alternative to docker-compose.dev.yml).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$("$ROOT/scripts/pb-bin.sh")"
exec "$BIN" serve --http=127.0.0.1:8090 --dir="$ROOT/server/pb_data" \
  --migrationsDir="$ROOT/server/pb_migrations" --hooksDir="$ROOT/server/pb_hooks" "$@"
