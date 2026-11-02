#!/usr/bin/env bash
# One-time production setup on the server. Run from the repo root: bash scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/lib.sh

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

read -r -s -p "Choose the app password for $ADMIN_EMAIL (min 10 chars): " PASS; echo
read -r -s -p "Repeat password: " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "Passwords don't match."; exit 1; }
[ ${#PASS} -ge 10 ] || { echo "Password too short."; exit 1; }

# The dashboard superuser gets its own random password, so the app password (typed on phones) never grants admin access.
# pipefail off here: head closing the pipe kills tr with SIGPIPE, which would abort the script.
SU_PASS=$(set +o pipefail; LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
[ ${#SU_PASS} -eq 24 ] || { echo "Could not generate the admin password."; exit 1; }
docker compose exec -T pocketbase /pb/pocketbase superuser upsert "$ADMIN_EMAIL" "$SU_PASS" --dir=/pb/pb_data >/dev/null

# Create the single app user through the API with a superuser token (public sign-up is disabled).
TOKEN=$(printf '{"identity":%s,"password":%s}' "$(json_str "$ADMIN_EMAIL")" "$(json_str "$SU_PASS")" \
  | pb_post /api/collections/_superusers/auth-with-password | sed -n 's/.*"token":"\([^"]*\)".*/\1/p' || true)
[ -n "$TOKEN" ] || { echo "Could not sign in as the superuser — check 'docker compose logs pocketbase'."; exit 1; }

printf '{"email":%s,"password":%s,"passwordConfirm":%s,"verified":true}' "$(json_str "$ADMIN_EMAIL")" "$(json_str "$PASS")" "$(json_str "$PASS")" \
  | pb_post /api/collections/users/records "$TOKEN" >/dev/null 2>&1 || true

# Whatever happened above, prove the final state: the app user must be able to sign in with this password.
if printf '{"identity":%s,"password":%s}' "$(json_str "$ADMIN_EMAIL")" "$(json_str "$PASS")" \
  | pb_post /api/collections/users/auth-with-password >/dev/null 2>&1; then
  echo "App user ready."
else
  echo "Could not create the app user, or $ADMIN_EMAIL already exists with a different password."
  echo "Reset it in the admin dashboard (see docs/DEPLOY.md), then sign in."
  exit 1
fi

echo
echo "Done. Open https://${DOMAIN#http://} and sign in as $ADMIN_EMAIL."
echo
echo "Admin dashboard (superuser) password — store it in your password manager now, it is not shown again:"
echo "  $SU_PASS"
