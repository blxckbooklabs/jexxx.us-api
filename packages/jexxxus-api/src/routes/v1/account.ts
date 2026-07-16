import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  loadAccountQueryModule,
  loadVaultSessionHelpers,
} from "../../lib/account-session.js";
import { requireAccountSession } from "../../lib/require-account-session.js";
import { getVaultConfigStatus } from "../../lib/server-config.js";
import { loadCliModule } from "../../lib/cli-loader.js";
import { isSuperAdminClerkUser } from "../../lib/super-admin.js";

const ACTIONS = [
  "summary",
  "contacts",
  "contact",
  "journal",
  "timeline",
  "events",
  "profiles",
  "playlists",
  "playlist",
  "export_preview",
] as const;

const querySchema = z.object({
  action: z.enum(ACTIONS),
  target: z.enum(["blxckbook", "nxt", "auto"]).optional(),
  contactName: z.string().optional(),
  relationshipStatus: z.string().optional(),
  playlistName: z.string().optional(),
  asUserId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const exportQuerySchema = z.object({
  target: z.enum(["blxckbook", "nxt", "all"]).default("all"),
  includeTv: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  asUserId: z.string().optional(),
});

/** Public agent contract — no auth (registered on the public Fastify app). */
export function getAccountSchemaPayload() {
  return {
    service: "JEXXXUS | API — Live Account Vault",
    version: "1.0.0",
    auth: "Clerk session JWT via Authorization: Bearer <token>",
    cli_auth: {
      login: "jexxxus auth login",
      refresh: "jexxxus auth refresh",
      token: "jexxxus auth token -q",
      note: "Use a fresh Bearer token per request batch — do not read ~/.jexxxus/credentials.json directly.",
    },
    description:
      "Live, RLS-scoped account data — same sources as BLXCKCHAT Kingdom Agent, JEXXXUS CLI account_query, and BLXCKBOOK/NXT dashboard exports. Replaces stale manual JSON uploads for agents.",
    endpoints: {
      "GET /api/v1/account/schema": "This machine-readable contract (public, no auth)",
      "GET /api/v1/tools/schema": "BLXCKCHAT tool catalog for Hermes (public, no auth)",
      "GET /api/v1/account/me": "Preflight — verify token + vault session (auth required)",
      "GET /api/v1/account/summary": "Vault counts and recent activity snapshot (auth required)",
      "GET /api/v1/account/export?target=all|blxckbook|nxt": "Full live JSON export (auth required)",
      "POST /api/v1/account/query": "Flexible account_query actions (auth required)",
      "POST /api/v1/tools/execute": "Execute bible_query, tv_query, veil_query, music_query, law_query, docs_query, vault tools (auth required)",
    },
    actions: ACTIONS,
    sources: ["blxckbook", "nxt", "tv"],
    security: {
      model: "Clerk JWT verified server-side; Supabase RLS via anon key + user JWT",
      writes: "Destructive tools require confirm: true on POST /api/v1/tools/execute",
    },
  };
}

export const accountRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/me", async (request: any, reply) => {
    const session = await requireAccountSession(request, reply);
    if (!session) return;

    const vault = getVaultConfigStatus();
    return {
      ok: true,
      userId: session.creds.userId,
      email: session.creds.email,
      fullName: session.creds.fullName ?? null,
      isSuperAdmin: session.isSuperAdmin,
      vaultReady: vault.clerk && vault.supabaseAnon,
      auth: "clerk_session_jwt",
      cli: {
        login: "jexxxus auth login",
        token: "jexxxus auth token -q",
      },
    };
  });

  fastify.get("/summary", async (request: any, reply) => {
    const session = await requireAccountSession(request, reply);
    if (!session) return;

    const asUserId =
      typeof request.query?.asUserId === "string" ? request.query.asUserId : undefined;

    if (asUserId && !session.isSuperAdmin) {
      return reply.status(403).send({ error: "forbidden", message: "asUserId requires super-admin." });
    }

    const accountQuery = await loadAccountQueryModule();
    const summary = await accountQuery.fetchAccountSummary(session, asUserId);
    return {
      fetched_at: new Date().toISOString(),
      live: true,
      data: summary,
    };
  });

  fastify.get("/export", async (request: any, reply) => {
    const session = await requireAccountSession(request, reply);
    if (!session) return;

    const parsed = exportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "validation", details: parsed.error.flatten() });
    }

    const { target, includeTv, asUserId } = parsed.data;
    if (asUserId && !session.isSuperAdmin) {
      return reply.status(403).send({ error: "forbidden", message: "asUserId requires super-admin." });
    }

    const helpers = await loadVaultSessionHelpers();
    const bbVault = helpers.resolveVaultClient(session, "blxckbook", asUserId);
    const nxtVault = helpers.resolveVaultClient(session, "nxt", asUserId);
    const tvVault = helpers.resolveTvClient(session, asUserId);

    const bbMod = await loadCliModule<{
      fetchBlxckbookExport: (
        client: unknown,
        userId: string,
        email: string,
      ) => Promise<unknown>;
    }>("lib/account-data/blxckbook-export.js");
    const nxtMod = await loadCliModule<{
      fetchNxtExport: (client: unknown, userId: string) => Promise<unknown>;
    }>("lib/account-data/nxt-export.js");
    const tvMod = await loadCliModule<{
      fetchUserPlaylists: (
        client: unknown,
        userId: string,
        opts?: { limit?: number },
      ) => Promise<unknown[]>;
      fetchTvPlaylistSummary: (client: unknown, userId: string) => Promise<unknown>;
    }>("lib/account-data/tv-playlists.js");

    const payload: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      live: true,
      source: "jexxx.us-api",
      user: { id: bbVault.effectiveUserId, email: session.creds.email },
      elevated: bbVault.elevated || nxtVault.elevated || tvVault.elevated,
    };

    if (target === "blxckbook" || target === "all") {
      payload.blxckbook = await bbMod.fetchBlxckbookExport(
        bbVault.client,
        bbVault.effectiveUserId,
        session.creds.email,
      );
    }
    if (target === "nxt" || target === "all") {
      payload.nxt = await nxtMod.fetchNxtExport(nxtVault.client, nxtVault.effectiveUserId);
    }
    if (includeTv || target === "all") {
      payload.tv = {
        summary: await tvMod.fetchTvPlaylistSummary(tvVault.client, tvVault.effectiveUserId),
        playlists: await tvMod.fetchUserPlaylists(tvVault.client, tvVault.effectiveUserId, {
          limit: 50,
        }),
      };
    }

    return payload;
  });

  fastify.post("/query", async (request: any, reply) => {
    const session = await requireAccountSession(request, reply);
    if (!session) return;

    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "validation", details: parsed.error.flatten() });
    }

    const args = parsed.data;
    if (args.asUserId && !isSuperAdminClerkUser(session.creds.userId)) {
      return reply.status(403).send({ error: "forbidden", message: "asUserId requires super-admin." });
    }

    const accountQuery = await loadAccountQueryModule();
    const raw = await accountQuery.executeAccountQuery(session, args);

    if (args.action === "summary" || args.action === "export_preview") {
      try {
        return {
          fetched_at: new Date().toISOString(),
          live: true,
          action: args.action,
          data: JSON.parse(raw),
        };
      } catch {
        return { fetched_at: new Date().toISOString(), live: true, action: args.action, result: raw };
      }
    }

    return {
      fetched_at: new Date().toISOString(),
      live: true,
      action: args.action,
      result: raw,
    };
  });
};