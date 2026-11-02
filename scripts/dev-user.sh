#!/usr/bin/env bash
# Creates the dev superuser and the single app user. Usage: scripts/dev-user.sh <email> <password>
# Requires PocketBase running on $PB_URL (default http://127.0.0.1:8090).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL=$1; PASS=$2; PB_URL=${PB_URL:-http://127.0.0.1:8090}
BIN="$("$ROOT/scripts/pb-bin.sh")"
"$BIN" superuser upsert "$EMAIL" "$PASS" --dir="$ROOT/server/pb_data" >/dev/null
TOKEN=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$EMAIL\",\"password\":\"$PASS\"}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token))")
curl -s -o /dev/null -w 'create user: %{http_code}\n' -X POST "$PB_URL/api/collections/users/records" \
  -H "Authorization: $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"passwordConfirm\":\"$PASS\",\"verified\":true}"
