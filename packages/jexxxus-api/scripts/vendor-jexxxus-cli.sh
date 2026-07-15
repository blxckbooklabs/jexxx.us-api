#!/usr/bin/env bash
# Copy jexxx.us-cli dist into vendor/ for Railway / solo-repo deploys.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIBLING="$ROOT/../../../jexxx.us-cli"
VENDOR_DIST="$ROOT/vendor/jexxxus-cli/dist"

if [ ! -f "$SIBLING/package.json" ]; then
  SIBLING="$ROOT/../../jexxx.us-cli"
fi

if [ -f "$SIBLING/package.json" ]; then
  echo "Building jexxx.us-cli in ${SIBLING}"
  (cd "$SIBLING" && npm run build)
  mkdir -p "$ROOT/vendor/jexxxus-cli"
  rm -rf "$VENDOR_DIST"
  rsync -a --delete "$SIBLING/dist/" "$VENDOR_DIST/"
  git -C "$SIBLING" rev-parse HEAD > "$ROOT/vendor/jexxxus-cli/VENDOR_REV"
  echo "Synced vendor/jexxxus-cli/dist @ $(head -c 7 "$ROOT/vendor/jexxxus-cli/VENDOR_REV")"
  exit 0
fi

if [ -f "$VENDOR_DIST/index.js" ]; then
  echo "Using committed vendor/jexxxus-cli/dist"
  exit 0
fi

echo "jexxx.us-cli dist missing. Build sibling repo or commit vendor/jexxxus-cli." >&2
exit 1