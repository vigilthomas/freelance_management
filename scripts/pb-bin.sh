#!/usr/bin/env bash
# Prints the path to a native PocketBase binary for local dev, downloading the pinned version if missing.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(cat "$ROOT/server/PB_VERSION")"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) OS=windows; EXE=pocketbase.exe ;;
  Darwin) OS=darwin; EXE=pocketbase ;;
  *) OS=linux; EXE=pocketbase ;;
esac
ARCH=amd64; [ "$(uname -m)" = "arm64" ] || [ "$(uname -m)" = "aarch64" ] && ARCH=arm64
BIN="$ROOT/server/bin/$EXE"
if [ ! -x "$BIN" ] || ! "$BIN" --version | grep -q "$VERSION"; then
  mkdir -p "$ROOT/server/bin"
  curl -sSL -o "$ROOT/server/bin/pb.zip" "https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${OS}_${ARCH}.zip" >&2
  (cd "$ROOT/server/bin" && unzip -o -q pb.zip "$EXE" && rm pb.zip)
fi
echo "$BIN"
