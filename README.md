# JEXXXUS | API

[![Deployed](https://img.shields.io/badge/Deployed-api.jexxx.us-blue)](https://api.jexxx.us)

> Authenticated vault gateway for the **JEXXXUS** ecosystem — Clerk session JWT + Supabase RLS,
> with parity to BLXCKCHAT Kingdom Agent and JEXXXUS CLI.

## What it does

Once a user is signed in via **`jexxxus auth login`**, the API provides secure account-level CRUD
over their BLXCKBOOK, NXT, and TV data — no service-role keys on the client, no stale JSON uploads.

| Capability | Endpoint |
| ---------- | -------- |
| Preflight (am I signed in?) | `GET /api/v1/account/me` |
| Vault reads | `GET /api/v1/account/summary`, `POST /api/v1/account/query` |
| Vault export | `GET /api/v1/account/export` |
| Tool proxy (Bible, TV, VEIL, Law, Docs, CRUD) | `POST /api/v1/tools/execute` |
| Agent contracts | `GET /api/v1/account/schema`, `GET /api/v1/tools/schema` |

See [SECURITY.md](./SECURITY.md) for the full threat model and self-host checklist.

**Open-sourcing?** See [OPEN-SOURCE-PREP.md](./OPEN-SOURCE-PREP.md) — fresh GitHub repo + orphan branch cleans git history.

## Quickstart (end-user)

### 1. Sign in once (CLI)

```bash
jexxxus auth login    # device flow → secure.jexxx.us
jexxxus auth status   # confirm signed in
```

### 2. Call the API with a fresh token

Clerk session JWTs are short-lived (~60s). Refresh before each batch:

```bash
export JEXXXUS_API_URL=https://api.jexxx.us   # or your self-hosted URL
TOKEN=$(jexxxus auth token -q)

# Preflight
curl -sS "$JEXXXUS_API_URL/api/v1/account/me" \
  -H "Authorization: Bearer $TOKEN"

# Vault summary
curl -sS "$JEXXXUS_API_URL/api/v1/account/summary" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. CRUD via tool proxy

Writes require `"confirm": true`:

```bash
TOKEN=$(jexxxus auth token -q)

# Create
curl -sS -X POST "$JEXXXUS_API_URL/api/v1/tools/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tool":"add_contact","args":{"name":"Bathsheba"},"confirm":true}'

# Read
curl -sS -X POST "$JEXXXUS_API_URL/api/v1/tools/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tool":"account_query","args":{"action":"contact","contactName":"Bathsheba","target":"blxckbook"}}'

# Delete
curl -sS -X POST "$JEXXXUS_API_URL/api/v1/tools/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tool":"delete_contact","args":{"target":"blxckbook","contactName":"Bathsheba"},"confirm":true}'
```

## Self-host (open-source operators)

```bash
git clone git@github.com:blxckbooklabs/jexxx.us-api.git
cd jexxx.us-api
pnpm install --no-frozen-lockfile
cp packages/jexxxus-api/.env.example packages/jexxxus-api/.env
# Edit .env — Clerk + Supabase from your project
cd packages/jexxxus-api && npm run build && npm start
```

### Required environment

| Variable | Purpose |
| -------- | ------- |
| `CLERK_SECRET_KEY` | Verify Bearer session JWTs |
| `SUPABASE_URL` | MAMAbase URL |
| `SUPABASE_ANON_KEY` | RLS-scoped user queries |
| `JEXXXUS_ACCOUNT_API=off` | **Required on server** — prevents HTTP loopback |

### Recommended for OSS

| Variable | Value | Why |
| -------- | ----- | --- |
| `JEXXXUS_API_SURFACE` | `vault` | Account + tools only — minimal attack surface |
| `JEXXXUS_ENABLE_PUBLIC_AI_ROUTES` | `false` | Avoid unauthenticated LLM/TTS cost abuse |
| `JEXXXUS_CORS_ORIGINS` | your frontends | Restrict browser origins |

## Architecture

```mermaid
graph LR
    CLI["jexxxus auth login"] --> Token["jexxxus auth token -q"]
    Token --> API["JEXXXUS | API"]
    API --> Clerk["Clerk JWT verify"]
    Clerk --> RLS["Supabase anon + user JWT"]
    RLS --> Vault["BLXCKBOOK + NXT + TV"]
```

Account logic is vendored from `jexxx.us-cli/dist` at build time (`scripts/vendor-jexxxus-cli.sh`).

## Deploy (always-on host)

Empire standard: Mac LaunchAgent or VPS Docker on port **8787**, TLS via Cloudflare Tunnel or Caddy.

```bash
# Mac (development / home tunnel)
bash jexxx.us-infrastructure/jexxxus-api/install-api-launchd.sh
curl http://127.0.0.1:8787/health
```

Full guide: `jexxx.us-infrastructure/jexxxus-api/DEPLOY.md`

**Do not deploy this Fastify service to Vercel** — it requires a persistent Node process.

## Brand Spellings (STRICT)

| Correct | Forbidden |
| ------- | --------- |
| wing6 | Wing6/WING6 |
| VEIL | Veil/veil |
| JEXXXUS | Jexxxus |
| BLXCKBOOK | Blackbook |
| NTX | Ntx |

---

*Your life, your vault; your memories, secured; your data, private.*