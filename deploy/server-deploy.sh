#!/usr/bin/env bash
# Runs on the server as the forced command of the CI deploy key (installed at /usr/local/bin/forge-deploy).
# Reads a .tar.gz of the repo on stdin, swaps it in for /opt/forge (keeping .env), rebuilds,
# and rolls back to the previous copy if the app doesn't come up healthy.
set -euo pipefail
APP=/opt/forge NEW=/opt/forge.new PREV=/opt/forge.prev

exec 9>/tmp/forge-deploy.lock
flock -n 9 || { echo "Another deploy is running."; exit 1; }

rm -rf "$NEW"; mkdir -p "$NEW"
tar -xzf - -C "$NEW"
cp -p "$APP/.env" "$NEW/.env"
set -a; . "$APP/.env"; set +a

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS -H "Host: ${DOMAIN#http://}" "http://127.0.0.1:${WEB_PORT:-8095}/api/health" >/dev/null 2>&1 && return 0
    sleep 3
  done
  return 1
}

rm -rf "$PREV"; mv "$APP" "$PREV"; mv "$NEW" "$APP"
cd "$APP"
echo "Building and starting…"
if docker compose up -d --build --remove-orphans && healthy; then
  docker image prune -f --filter "label=com.docker.compose.project=forge" >/dev/null || true
  echo "Deployed $(date -u +%FT%TZ). Healthy."
  exit 0
fi

echo "Deploy failed — rolling back to the previous version."
docker compose logs --tail 30 || true
rm -rf "$NEW"; mv "$APP" "$NEW"; mv "$PREV" "$APP"
cd "$APP" && docker compose up -d --build --remove-orphans
healthy && echo "Rolled back; previous version is running." || echo "Rollback is unhealthy too — check the server."
exit 1
