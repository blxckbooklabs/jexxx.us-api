import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { loadCliModule } from "../../lib/cli-loader.js";
import type { AccountSessionResult } from "../../lib/account-session.js";
import { requireAccountSession } from "../../lib/require-account-session.js";

type BlxckchatTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresConfirmation: boolean;
  execute(args: Record<string, unknown>): Promise<string>;
};

/** Tools that require local filesystem, operator shell, or are unsafe on the API host. */
const BLOCKED_TOOLS = new Set([
  "run_shell",
  "read_local_file",
  "write_local_file",
  "edit_local_file",
  "run_doctor",
  "send_notification",
  "import_contacts",
]);

const executeSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  confirm: z.boolean().optional(),
});

async function loadApiToolRegistry(): Promise<BlxckchatTool[]> {
  const registryMod = await loadCliModule<{
    buildToolRegistry: (options?: {
      allowShell?: boolean;
      includeAccountQuery?: boolean;
    }) => BlxckchatTool[];
  }>("lib/blxckchat/tools/registry.js");

  return registryMod.buildToolRegistry({
    includeAccountQuery: true,
    allowShell: false,
  });
}

export async function getToolsSchemaPayload() {
  const tools = await loadApiToolRegistry();
  const allowed = tools.filter((t) => !BLOCKED_TOOLS.has(t.name));

  return {
    service: "JEXXXUS | API — Tool Proxy",
    version: "1.0.0",
    auth: "Clerk session JWT via Authorization: Bearer <token>",
    cli_auth: {
      login: "jexxxus auth login",
      token: "jexxxus auth token -q",
      writes: "Pass confirm: true for destructive tools (add_contact, delete_contact, etc.)",
    },
    description:
      "Authenticated proxy to the BLXCKCHAT / CLI tool registry — Bible, TV, VEIL, Music, Law, Docs, " +
      "vault reads, and vault writes with the same Clerk + RLS session as BLXCKCHAT.",
    endpoints: {
      "GET /api/v1/tools/schema": "This machine-readable tool catalog (public, no auth)",
      "POST /api/v1/tools/execute": "Execute one tool by name (auth required)",
    },
    blocked_tools: [...BLOCKED_TOOLS].sort(),
    tools: allowed.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      requires_confirmation: t.requiresConfirmation,
    })),
  };
}

export const toolsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/execute", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAccountSession(request, reply);
    if (!session) return;

    const parsed = executeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "validation", details: parsed.error.flatten() });
    }

    const { tool, args, confirm } = parsed.data;
    const normalized = tool.trim();

    if (BLOCKED_TOOLS.has(normalized)) {
      return reply.status(403).send({
        error: "forbidden",
        message: `Tool "${normalized}" is not available on JEXXXUS | API.`,
      });
    }

    const registry = await loadApiToolRegistry();
    const entry = registry.find((t) => t.name === normalized);
    if (!entry) {
      return reply.status(404).send({
        error: "not_found",
        message: `Unknown tool "${normalized}". See GET /api/v1/tools/schema.`,
      });
    }

    if (entry.requiresConfirmation && confirm !== true) {
      return reply.status(428).send({
        error: "confirmation_required",
        message: `Tool "${normalized}" requires confirm: true in the request body.`,
        tool: normalized,
      });
    }

    const sessionMod = await loadCliModule<{
      setAccountSessionResolver: (
        resolver: (() => Promise<AccountSessionResult>) | null,
      ) => void;
    }>("lib/account-data/session.js");

    sessionMod.setAccountSessionResolver(async () => ({ ok: true, session }));

    const userId = session.creds.userId;
    (request as any).log?.info?.(
      { userId, tool: normalized, confirmed: confirm === true },
      "tools.execute",
    );

    try {
      const result = await entry.execute(args);
      return {
        executed_at: new Date().toISOString(),
        live: true,
        tool: normalized,
        result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({
        error: "tool_execution_failed",
        tool: normalized,
        message,
      });
    } finally {
      sessionMod.setAccountSessionResolver(null);
    }
  });
};