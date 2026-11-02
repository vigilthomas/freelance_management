#!/usr/bin/env bash
# One-time production setup on the server. Run from the repo root: bash scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — edit DOMAIN, ADMIN_EMAIL and ADMIN_IPS, then run this script again."
  exit 1
fi
set -a; . ./.env; set +a
: "${DOMAIN:?Set DOMAIN in .env}" "${ADMIN_EMAIL:?Set ADMIN_EMAIL in .env}"

echo "Building and starting the stack…"
docker compose up -d --build

echo "Waiting for PocketBase…"
for _ in $(seq 1 60); do
  docker compose exec -T pocketbase wget -qO- http://127.0.0.1:8090/api/health >/dev/null 2>&1 && break
  sleep 2
done

read -r -s -p "Choose a password for $ADMIN_EMAIL (min 10 chars): " PASS; echo
read -r -s -p "Repeat password: " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "Passwords don't match."; exit 1; }
[ ${#PASS} -ge 10 ] || { echo "Password too short."; exit 1; }

docker compose exec -T pocketbase /pb/pocketbase superuser upsert "$ADMIN_EMAIL" "$PASS" --dir=/pb/pb_data

# Create the single app user through the API with a superuser token (public sign-up is disabled).
BODY=$(printf '{"identity":"%s","password":"%s"}' "$ADMIN_EMAIL" "$PASS")
TOKEN=$(docker compose exec -T pocketbase wget -qO- --header 'Content-Type: application/json' \
  --post-data "$BODY" http://127.0.0.1:8090/api/collections/_superusers/auth-with-password | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
USER_BODY=$(printf '{"email":"%s","password":"%s","passwordConfirm":"%s","verified":true}' "$ADMIN_EMAIL" "$PASS" "$PASS")
if docker compose exec -T pocketbase wget -qO- --header 'Content-Type: application/json' --header "Authorization: $TOKEN" \
  --post-data "$USER_BODY" http://127.0.0.1:8090/api/collections/users/records >/dev/null 2>&1; then
  echo "App user created."
else
  echo "App user already exists (or could not be created) — you can manage it in the admin dashboard."
fi

echo
echo "Done. Open https://$DOMAIN and sign in as $ADMIN_EMAIL."
