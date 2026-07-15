# Migration — clean open-source repo (complete)

**Status:** Cutover complete.

| Item | Value |
| ---- | ----- |
| Local path | `/Users/dylanroberts/Documents/non-music/Dev/GitHub/JEXXXUS/jexxx.us-api` |
| Remote | `git@github.com:blxckbooklabs/jexxx.us-api.git` |
| History | Clean — migrated from legacy repo via `export-oss-clean.sh` (no `.env` / `node_modules` in history) |

## Verify after push

```bash
bash scripts/oss-preflight.sh
cd packages/jexxxus-api && pnpm install && npm run build
curl http://127.0.0.1:8787/health   # after LaunchAgent restart
```

## Mac API (unchanged path)

```bash
bash jexxx.us-infrastructure/jexxxus-api/install-api-launchd.sh
```

LaunchAgent already targets `jexxx.us-api/packages/jexxxus-api/dist/index.js`.

## Legacy repo

Archive the pre-migration local clone if you kept a copy. The old GitHub repo should be deleted or archived after this remote accepts the clean `main` push.