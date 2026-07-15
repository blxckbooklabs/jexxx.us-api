# Open-Source Prep — Fresh GitHub Repository

Deleting the GitHub repo and creating a new one **only cleans history if you push a new git history**, not the same local `.git` with all old commits.

| Approach | Cleans history? |
| -------- | --------------- |
| Delete GitHub repo → push existing `main` (full history) | **No** — `.env` and old commits return |
| Delete GitHub repo → push **orphan branch** or **new `git init`** | **Yes** — one clean root commit |

## Before you delete anything

1. **Rotate** `GEMINI_API_KEY` (and any key ever in `packages/jexxxus-api/.env`) — it lived in git history.
2. Confirm **Clerk / Supabase live keys** were never committed (infra `.env` outside repo is fine).
3. Run the preflight script (below).

## Preflight (run from repo root)

```bash
bash scripts/oss-preflight.sh
```

Must exit `0` before you publish.

## Recommended: orphan branch → new GitHub repo

From `jexxx.us-api` root, after preflight passes:

```bash
# 1. Orphan branch = no parent commits
git checkout --orphan oss-release

# 2. Stage only what belongs in the public repo (.gitignore applies)
git add -A
git status   # MANUALLY verify: no .env, no node_modules, no credentials

# 3. Single clean root commit
git commit -m "feat: initial open-source release — JEXXXUS | API vault gateway"

# 4. On GitHub: delete old repo (or archive), create empty repo jexxx.us-api

# 5. Point remote and push (history is only this one commit)
git remote set-url origin git@github.com:blxckbooklabs/jexxx.us-api.git
git push -u origin oss-release:main
```

## Alternative: export to a new folder

```bash
bash scripts/export-oss-clean.sh /path/to/jexxx.us-api-public
cd /path/to/jexxx.us-api-public
git init
git add -A && git status
git commit -m "feat: initial open-source release"
git remote add origin git@github.com:blxckbooklabs/jexxx.us-api.git
git push -u origin main
```

## What the public repo should contain

| Include | Exclude |
| ------- | ------- |
| `packages/jexxxus-api/src/` | `packages/jexxxus-api/.env` |
| `packages/jexxxus-api/.env.example` | `node_modules/` |
| `SECURITY.md`, `README.md`, `AGENTS.md`, `LICENSE` | Real API keys anywhere |
| `vendor/jexxxus-cli/dist/` (built CLI parity) | Optional: slim to API-only monorepo later |

## After publish

- Set repo visibility to **Public**
- Enable GitHub **secret scanning** (Settings → Code security)
- Add `security@jexxx.us` to README/SECURITY.md for reports
- Mac production: `JEXXXUS_API_SURFACE=vault` in infra `.env`

## If the old repo was already public

Treat the Gemini key as compromised. Rotate before the new push, even with fresh history.