#!/usr/bin/env bash
# Static checks for the deploy files (no Docker needed): bash server/test/deploy.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }

# 1. Passwords with quotes, backslashes and other JSON-special characters survive json_str.
# shellcheck source=../../scripts/lib.sh
. scripts/lib.sh 2>/dev/null || { echo "FAIL scripts/lib.sh missing"; exit 1; }
for pw in 'plain-password' 'has"quote' 'back\slash' 'tab	inside' 'both\"mixed' '$dollar`tick'; do
  body="{\"password\":$(json_str "$pw")}"
  got=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).password)' "$body" 2>/dev/null)
  check "json_str round-trips $(printf %q "$pw")" '[ "$got" = "$pw" ]'
done

# 2. Superuser/admin API routes are limited to ADMIN_IPS, app routes are not.
check 'Caddyfile gates the superuser and admin API by ADMIN_IPS' \
  'for p in /api/collections/_superusers/\* /api/settings\* /api/backups\* /api/logs\* /api/crons\*; do grep -q -- "$p" Caddyfile || exit 1; done'
re=$(sed -n 's/.*path_regexp \(\^.*\)$/\1/p' Caddyfile | head -1)
check 'Caddyfile has a collection-management regexp' '[ -n "$re" ]'
node -e '
  const re = new RegExp(process.argv[1]);
  const admin = ["/api/collections", "/api/collections/", "/api/collections/clients", "/api/collections/clients/truncate", "/api/collections/import"];
  const app = ["/api/collections/clients/records", "/api/collections/clients/records/abc", "/api/collections/users/auth-with-password", "/api/collections/users/auth-refresh", "/api/realtime", "/api/files/x/y/z.png"];
  const bad = [...admin.filter((p) => !re.test(p)).map((p) => "not gated: " + p), ...app.filter((p) => re.test(p)).map((p) => "wrongly gated: " + p)];
  if (bad.length) { console.log(bad.join("\n")); process.exit(1); }
' "$re" && echo "ok   collection-management regexp gates admin paths only" || { echo "FAIL collection-management regexp"; fail=1; }

# 3. setup.sh no longer reuses the app password for the superuser.
check 'setup.sh uses a separate superuser password' 'grep -q "SU_PASS" scripts/setup.sh'

[ $fail = 0 ] && echo "ALL OK" || { echo "SOME CHECKS FAILED"; exit 1; }
