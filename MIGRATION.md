# Migration — jexxx.us-api → jexxx.us-api2

**Status:** Clean root commit pushed to `git@github.com:blxckbooklabs/jexxx.us-api2.git`

| Item | This repo |
| ---- | --------- |
| Git history | **1 commit** (`2111e4a`) — no legacy `.env` / `node_modules` history |
| Secrets | `.env` excluded; only `.env.example` |
| Preflight | `bash scripts/oss-preflight.sh` passes |

## When you cut over

1. Verify GitHub: https://github.com/blxckbooklabs/jexxx.us-api2
2. Test build: `cd packages/jexxxus-api && pnpm install && npm run build`
3. Point Mac LaunchAgent at this folder (after rename):
   - `jexxx.us-infrastructure/jexxxus-api/install-api-launchd.sh` (uses `../jexxx.us-api/packages/jexxxus-api` today — update path after rename)
4. Delete `blxckbooklabs/jexxx.us-api` on GitHub
5. Archive local `jexxx.us-api/` folder
6. Rename `jexxx.us-api2` → `jexxx.us-api`
7. On GitHub: rename `jexxx.us-api2` → `jexxx.us-api` (or create final repo and update remote)

## Remote after rename

```bash
git remote set-url origin git@github.com:blxckbooklabs/jexxx.us-api.git
```