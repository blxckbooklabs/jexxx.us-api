import type { FastifyPluginAsync } from "fastify";
/** Public agent contract — no auth (registered on the public Fastify app). */
export declare function getAccountSchemaPayload(): {
    service: string;
    version: string;
    auth: string;
    cli_auth: {
        login: string;
        refresh: string;
        token: string;
        note: string;
    };
    description: string;
    endpoints: {
        "GET /api/v1/account/schema": string;
        "GET /api/v1/tools/schema": string;
        "GET /api/v1/account/me": string;
        "GET /api/v1/account/summary": string;
        "GET /api/v1/account/export?target=all|blxckbook|nxt": string;
        "POST /api/v1/account/query": string;
        "POST /api/v1/tools/execute": string;
    };
    actions: readonly ["summary", "contacts", "contact", "journal", "timeline", "events", "profiles", "playlists", "playlist", "export_preview"];
    sources: string[];
    security: {
        model: string;
        writes: string;
    };
};
export declare const accountRoutes: FastifyPluginAsync;
