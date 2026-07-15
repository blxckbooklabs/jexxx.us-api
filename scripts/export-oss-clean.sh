#!/usr/bin/env bash
# Export a clean tree for git init (no .git, no node_modules, no .env).
set -euo pipefail

DEST="${1:-}"
if [[ -z "$DEST" ]]; then
  echo "Usage: $0 /path/to/export-dir" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'packages/jexxxus-api/.env' \
  --exclude '.DS_Store' \
  --exclude 'coverage' \
  --exclude '.turbo' \
  --exclude '.vercel' \
  "$ROOT/" "$DEST/"

echo "Exported clean tree to: $DEST"
echo "Next: cd $DEST && git init && bash scripts/oss-preflight.sh"