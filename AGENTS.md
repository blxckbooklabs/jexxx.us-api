# DOX framework - jexxx.us-api

## 1. Purpose

JEXXXUS | API is the empire's **authenticated vault gateway** at `https://api.jexxx.us`.
It exposes Live Account Vault routes and a BLXCKCHAT tool proxy so agents (Hermes, CLI,
BLXCKCHAT) can perform Clerk + RLS-scoped reads and writes without stale JSON uploads.

## 2. Ownership

Owned by JEXXXUS, LLC platform / infrastructure.

## 3. Local Contracts

- Account logic is **vendored** from `jexxx.us-cli/dist` (`scripts/vendor-jexxxus-cli.sh`).
  Rebuild and re-vendor CLI before API releases that depend on tool/session changes.
- Server **must** set `JEXXXUS_ACCOUNT_API=off` — direct Supabase only, no HTTP loopback.
- End-user auth: Clerk Bearer JWT from `jexxxus auth token -q` or BLXCKCHAT cookie session.
- Open-source default surface: `JEXXXUS_API_SURFACE=vault` (account + tools + bible only).

## 4. Work Guidance

- Read root `AGENTS.md` for brand spelling (`JEXXXUS`, `BLXCKBOOK`, `wing6`, `VEIL`).
- Security policy: `SECURITY.md` in this repo.
- Env template: `packages/jexxxus-api/.env.example`.
- Mac native deploy: `jexxx.us-infrastructure/jexxxus-api/` (LaunchAgent port 8787).
- After meaningful security or route changes, update `README.md` and `SECURITY.md`.

## 5. Verification

- `cd packages/jexxxus-api && npm run build && npm test`
- `curl http://127.0.0.1:8787/health` shows `vault.clerk` and `vault.supabaseAnon` true
- `curl /api/v1/account/me -H "Authorization: Bearer $(jexxxus auth token -q)"` returns `ok: true`
- Write tool test: `add_contact` + `delete_contact` with `confirm: true` on `/api/v1/tools/execute`

## 6. Key Paths

| Area | Path |
| ---- | ---- |
| Entry | `packages/jexxxus-api/src/index.ts` |
| Auth | `packages/jexxxus-api/src/middleware/auth.ts` |
| Config | `packages/jexxxus-api/src/lib/server-config.ts` |
| Account | `packages/jexxxus-api/src/routes/v1/account.ts` |
| Tools | `packages/jexxxus-api/src/routes/v1/tools.ts` |
| Session | `packages/jexxxus-api/src/lib/account-session.ts` |