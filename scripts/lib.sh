#!/usr/bin/env bash
# Shared helpers for the deploy scripts.

# Prints $1 as a JSON string literal (quotes, backslashes and control characters escaped).
json_str() {
  local s=$1 bs='\' q='"'
  s=${s//"$bs"/"$bs$bs"}
  s=${s//"$q"/"$bs$q"}
  s=${s//$'\t'/"${bs}t"}
  s=${s//$'\n'/"${bs}n"}
  s=${s//$'\r'/"${bs}r"}
  printf '"%s"' "$s"
}

# POSTs JSON from stdin inside the pocketbase container (keeps secrets out of process arguments).
# Usage: pb_post <path> [auth-token] < body.json   -> prints the response body; non-zero on HTTP error.
pb_post() {
  local path=$1 token=${2:-}
  # GNU wget can't --post-file a pipe, so the body goes through a private temp file in the container.
  docker compose exec -T -e TOKEN="$token" pocketbase sh -c \
    'f=$(mktemp); cat >"$f"; wget -qO- --header "Content-Type: application/json" --header "Authorization: $TOKEN" --post-file="$f" "http://127.0.0.1:8090$0"; rc=$?; rm -f "$f"; exit $rc' "$path"
}
