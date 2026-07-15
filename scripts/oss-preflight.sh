#!/usr/bin/env bash
# Fail if files that must not be public are staged or tracked.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }

check_absent() {
  local pattern="$1"
  local label="$2"
  if git ls-files --error-unmatch $pattern >/dev/null 2>&1; then
    red "[FAIL] Tracked in git: $label ($pattern)"
    FAIL=1
  fi
}

check_absent "packages/jexxxus-api/.env" ".env"
check_absent ".env" "root .env"

if git ls-files | rg '^node_modules/' >/dev/null 2>&1; then
  count=$(git ls-files | rg '^node_modules/' | wc -l | tr -d ' ')
  red "[FAIL] node_modules is tracked ($count files)."
  red "       Fresh-repo fix: use orphan branch (OPEN-SOURCE-PREP.md) — do not git add node_modules."
  red "       Or: git rm -r --cached node_modules && commit (large one-time change)."
  FAIL=1
fi

# Obvious secret patterns in tracked files (not node_modules)
if git grep -l 'AIzaSy[A-Za-z0-9_-]\{20,\}' -- ':!node_modules' ':!*.md' ':!.env.example' ':!scripts/oss-preflight.sh' 2>/dev/null | head -1 | grep -q .; then
  red "[FAIL] Possible Google API key in tracked source:"
  git grep -l 'AIzaSy' -- ':!node_modules' ':!*.md' ':!.env.example' ':!scripts/oss-preflight.sh' 2>/dev/null || true
  FAIL=1
fi

if git grep -l 'sk_live_[A-Za-z0-9]' -- ':!node_modules' ':!*.md' ':!.env.example' 2>/dev/null | head -1 | grep -q .; then
  red "[FAIL] Possible Clerk live secret in tracked source:"
  git grep -l 'sk_live_' -- ':!node_modules' ':!*.md' ':!.env.example' 2>/dev/null || true
  FAIL=1
fi

for f in LICENSE SECURITY.md README.md packages/jexxxus-api/.env.example; do
  if [[ ! -f "$f" ]]; then
    red "[FAIL] Missing required file: $f"
    FAIL=1
  fi
done

if [[ "$FAIL" -eq 0 ]]; then
  green "[OK] OSS preflight passed. Safe to create orphan branch / fresh repo push."
else
  red "[ABORT] Fix failures above before open-sourcing."
  exit 1
fi