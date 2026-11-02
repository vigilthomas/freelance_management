#!/usr/bin/env bash
# Smoke test against a running PocketBase. Usage: PB_URL=http://127.0.0.1:8090 bash server/test/smoke.sh
set -uo pipefail
PB_URL=${PB_URL:-http://127.0.0.1:8090}
EMAIL=${DEV_EMAIL:-dev@forge.test}
PASS=${DEV_PASSWORD:-devpassword123}
fail=0
check() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1 (expected $3, got $2)"; fail=1; fi; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);console.log(eval('o'+process.argv[1]))}catch(e){console.log('PARSE_ERROR')}})" "$1"; }

TOKEN=$(curl -s -X POST "$PB_URL/api/collections/users/auth-with-password" -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$EMAIL\",\"password\":\"$PASS\"}" | json .token)
[ -n "$TOKEN" ] && [ "$TOKEN" != "undefined" ] && [ "$TOKEN" != "PARSE_ERROR" ] && check "user login" yes yes || check "user login" no yes
AUTH="Authorization: $TOKEN"

check "task_statuses seeded" "$(curl -s "$PB_URL/api/collections/task_statuses/records" -H "$AUTH" | json .totalItems)" 3
check "settings row exists" "$(curl -s "$PB_URL/api/collections/settings/records/settings0000000" -H "$AUTH" | json .invoice_prefix)" "INV-"
check "gst components" "$(curl -s "$PB_URL/api/collections/tax_rates/records?filter=name%3D'GST%2018%25'" -H "$AUTH" | json '.items[0].components.length')" 2

ANON=$(curl -s -o /dev/null -w '%{http_code}' "$PB_URL/api/collections/clients/records")
ANON_ITEMS=$(curl -s "$PB_URL/api/collections/clients/records" | json .totalItems)
{ [ "$ANON" = "403" ] || [ "$ANON_ITEMS" = "0" ]; } && check "anon cannot read clients" yes yes || check "anon cannot read clients" "$ANON/$ANON_ITEMS" "403 or 0"

ID=$(node -e "const a='abcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<15;i++)s+=a[Math.floor(Math.random()*36)];console.log(s)")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PB_URL/api/collections/clients/records" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"id\":\"$ID\",\"name\":\"Smoke\",\"updated_at\":2000,\"deleted\":false}")
check "create client with client id" "$CODE" 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$PB_URL/api/collections/clients/records/$ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Older","updated_at":1000}')
check "stale update rejected" "$CODE" 409
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$PB_URL/api/collections/clients/records/$ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Newer","updated_at":3000}')
check "newer update accepted" "$CODE" 200
curl -s -o /dev/null -X DELETE "$PB_URL/api/collections/clients/records/$ID" -H "$AUTH"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PB_URL/api/collections/users/records" -H 'Content-Type: application/json' \
  -d '{"email":"x@y.test","password":"12345678abc","passwordConfirm":"12345678abc"}')
{ [ "$CODE" = "403" ] || [ "$CODE" = "400" ]; } && check "public signup disabled" yes yes || check "public signup disabled" "$CODE" "403/400"

[ $fail = 0 ] && echo "ALL OK" || { echo "SMOKE FAILED"; exit 1; }
