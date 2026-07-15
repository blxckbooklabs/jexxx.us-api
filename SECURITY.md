# Security Policy — JEXXXUS | API

JEXXXUS | API is an **authenticated vault gateway**. It verifies Clerk session JWTs server-side
and issues **RLS-scoped** Supabase queries — the same security model as BLXCKCHAT Kingdom Agent
and JEXXXUS CLI `account_query`.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Active    |

Report vulnerabilities to **security@jexxx.us** — do not file public GitHub issues for
undisclosed security bugs.

## Security Model

### End-user auth (default)

1. Operator runs `jexxxus auth login` (device flow via `secure.jexxx.us`)
2. CLI stores refresh token in `~/.jexxxus/credentials.json` (`0600`)
3. Before API calls: `jexxxus auth token -q` → fresh Clerk session JWT (~60s TTL)
4. Client sends `Authorization: Bearer <jwt>` to JEXXXUS | API
5. API verifies JWT with `CLERK_SECRET_KEY`, builds Supabase clients with `SUPABASE_ANON_KEY` + user JWT
6. Postgres RLS enforces row ownership — same as BLXCKCHAT signed-in chat

**Never** ship `SUPABASE_SERVICE_ROLE_KEY` to browsers or agent clients. It is server-only and
optional (super-admin elevation only).

### Server configuration tiers

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `CLERK_SECRET_KEY` | Yes | Verify Bearer session JWTs |
| `SUPABASE_URL` | Yes | MAMAbase project URL |
| `SUPABASE_ANON_KEY` | Yes | RLS-scoped user queries |
| `JEXXXUS_ACCOUNT_API=off` | Yes (server) | Prevents HTTP loopback to self |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Super-admin `asUserId` elevation only |
| `JEXXXUS_SUPER_ADMIN_CLERK_IDS` | No | Comma-separated Clerk user IDs (env only) |

### Route surfaces

| `JEXXXUS_API_SURFACE` | Mounted routes |
| --------------------- | -------------- |
| `vault` (recommended for OSS) | `/health`, `/api/v1/account/*`, `/api/v1/tools/*`, `/api/v1/bible/*` |
| `full` (empire default) | Above + legacy chat/intake/users/AI routes |

Self-hosters should use **`JEXXXUS_API_SURFACE=vault`** unless they explicitly need legacy routes.

### Tool proxy hardening

- **Blocked on API:** `run_shell`, local file tools, `run_doctor`, `send_notification`, `import_contacts`
- **Write tools** require `confirm: true` in `POST /api/v1/tools/execute`
- Tool executions are audit-logged (`userId`, tool name) — not full args (PII)
- Stricter rate limit on `/api/v1/tools/execute` (default 30/min per IP)

### Super-admin elevation

Cross-user reads (`asUserId`) require **both**:

1. Authenticated Clerk user on `JEXXXUS_SUPER_ADMIN_CLERK_IDS` allowlist
2. `SUPABASE_SERVICE_ROLE_KEY` configured on the API host

Never hardcode Clerk IDs in source. Configure via environment only.

## Deployment Checklist (open-source self-host)

- [ ] Copy `.env.example` → `.env`; never commit `.env`
- [ ] Set `JEXXXUS_ACCOUNT_API=off`
- [ ] Set `JEXXXUS_API_SURFACE=vault` unless legacy routes are required
- [ ] Set `JEXXXUS_ENABLE_PUBLIC_AI_ROUTES=false` if not using chat/TTS (prevents provider cost abuse)
- [ ] Set `JEXXXUS_ENABLE_OBSERVABILITY=false` (default) or restrict to super-admins
- [ ] Configure `JEXXXUS_CORS_ORIGINS` to your frontends only
- [ ] Optional: `CLERK_AUTHORIZED_PARTIES` to restrict JWT `azp`
- [ ] TLS terminate at reverse proxy (Caddy, Cloudflare Tunnel)
- [ ] Verify: `curl /health` then `curl /api/v1/account/me -H "Authorization: Bearer $(jexxxus auth token -q)"`

## What we do not store

- User passwords (Clerk handles auth)
- Long-lived access tokens server-side (stateless JWT verification per request)
- Refresh tokens on the API host (CLI device flow stores them locally)

---

*Your life, your vault; your memories, secured; your data, private.*