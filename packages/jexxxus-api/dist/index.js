import "./bootstrap-env.js";
import { authMiddleware } from "./middleware/auth.js";
import { tracingMiddleware, tracingResponseHook } from "./middleware/tracing.js";
import { registerSecurityHeaders } from "./middleware/security-headers.js";
import { requireSuperAdmin } from "./middleware/super-admin-guard.js";
import { userRoutes } from "./routes/users.js";
import { observabilityRoutes } from "./routes/observability.js";
import { intakeRoutes } from "./routes/intake.js";
import { modelsRoutes } from "./routes/v1/models.js";
import { chatRoutes } from "./routes/v1/chat.js";
import { solomonRoutes } from "./routes/v1/solomon.js";
import { accountRoutes, getAccountSchemaPayload } from "./routes/v1/account.js";
import { toolsRoutes, getToolsSchemaPayload } from "./routes/v1/tools.js";
import { bibleRoutes } from "./routes/v1/bible.js";
import { ttsRoutes } from "./routes/v1/tts.js";
import { getApiSurface, getRateLimitConfig, getVaultConfigStatus, legacyRoutesEnabled, loadCorsOrigins, observabilityRoutesEnabled, publicAiRoutesEnabled, validateVaultStartup, } from "./lib/server-config.js";
const loadServer = async () => {
    const createRequire = (await import("module")).createRequire;
    const req = createRequire(import.meta.url);
    // @ts-ignore
    const Fastify = req("fastify");
    // @ts-ignore
    const fastifyCors = req("@fastify/cors");
    // @ts-ignore
    const fastifyRateLimit = req("@fastify/rate-limit");
    const startup = validateVaultStartup();
    if (!startup.ok) {
        console.warn(`[JEXXXUS | API] Vault config incomplete — missing: ${startup.missing.join(", ")}. ` +
            "Account routes will return 503 until configured.");
    }
    const server = Fastify({
        logger: true,
        bodyLimit: 1_048_576, // 1 MiB — agent payloads, not file uploads
    });
    await registerSecurityHeaders(server);
    await server.register(fastifyCors, {
        origin: loadCorsOrigins(),
        credentials: true,
    });
    const rateLimit = getRateLimitConfig();
    await server.register(fastifyRateLimit, {
        global: true,
        max: rateLimit.global.max,
        timeWindow: rateLimit.global.timeWindow,
    });
    const vaultStatus = getVaultConfigStatus();
    const surface = getApiSurface();
    server.get("/health", async () => ({
        status: "ok",
        surface,
        vault: vaultStatus,
    }));
    server.get("/api/v1/account/schema", async () => getAccountSchemaPayload());
    server.get("/api/v1/tools/schema", async () => getToolsSchemaPayload());
    // Public read-only Bible surface (no provider cost).
    server.register(bibleRoutes, { prefix: "/api/v1/bible" });
    if (publicAiRoutesEnabled()) {
        server.register(chatRoutes, { prefix: "/api/v1/chat" });
        server.register(solomonRoutes, { prefix: "/api/v1/solomon" });
        server.register(modelsRoutes, { prefix: "/api/v1/models" });
        server.register(ttsRoutes, { prefix: "/api/v1/tts" });
    }
    if (legacyRoutesEnabled()) {
        server.register(intakeRoutes, { prefix: "/api/intake" });
    }
    server.register(async (protectedApp) => {
        protectedApp.addHook("onRequest", authMiddleware);
        protectedApp.addHook("onRequest", tracingMiddleware);
        protectedApp.addHook("onResponse", tracingResponseHook);
        protectedApp.register(accountRoutes, { prefix: "/api/v1/account" });
        protectedApp.register(async (toolsApp) => {
            const toolLimits = getRateLimitConfig().toolsExecute;
            await toolsApp.register(fastifyRateLimit, {
                max: toolLimits.max,
                timeWindow: toolLimits.timeWindow,
            });
            toolsApp.register(toolsRoutes, { prefix: "/api/v1/tools" });
        });
        if (legacyRoutesEnabled()) {
            protectedApp.register(userRoutes, { prefix: "/api/users" });
        }
        if (observabilityRoutesEnabled()) {
            protectedApp.register(async (obsApp) => {
                obsApp.addHook("onRequest", requireSuperAdmin);
                obsApp.register(observabilityRoutes, { prefix: "/api/obs" });
            });
        }
    });
    const port = Number.parseInt(process.env.PORT || "8080", 10);
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`JEXXXUS | API listening on :${port} (surface=${surface}, vault=${startup.ok ? "ready" : "misconfigured"})`);
};
loadServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map