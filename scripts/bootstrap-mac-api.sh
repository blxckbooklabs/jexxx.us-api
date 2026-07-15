#!/usr/bin/env bash
# Install deps + build after a clean clone (no node_modules in git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/packages/jexxxus-api"
INFRA="$ROOT/../jexxx.us-infrastructure/jexxxus-api"

echo "==> pnpm install (monorepo root)"
set +e
(cd "$ROOT" && pnpm install --no-frozen-lockfile)
INSTALL_RC=$?
set -e
if [[ "$INSTALL_RC" -ne 0 ]]; then
  echo "pnpm install exited $INSTALL_RC (often ERR_PNPM_IGNORED_BUILDS — continuing if node_modules exists)"
fi
if [[ ! -d "$ROOT/node_modules" ]] && [[ ! -f "$API_DIR/node_modules/@clerk/backend/package.json" ]]; then
  echo "Install did not produce node_modules. Try: cd $ROOT && pnpm approve-builds && pnpm install"
  exit 1
fi

echo "==> build jexxxus-api"
(cd "$API_DIR" && npm run build)

if [[ -f "$INFRA/install-api-launchd.sh" ]]; then
  echo "==> restart LaunchAgent"
  bash "$INFRA/install-api-launchd.sh"
else
  echo "==> install-api-launchd.sh not found at $INFRA"
  echo "    Start manually: cd $API_DIR && node dist/index.js"
fi

echo "==> health"
sleep 2
curl -sf "http://127.0.0.1:8787/health" && echo "" || {
  echo "Local health failed — see ~/Library/Logs/jexxxus-api.err.log"
  exit 1
}