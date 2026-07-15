import type { FastifyPluginAsync } from "fastify";
export declare function getToolsSchemaPayload(): Promise<{
    service: string;
    version: string;
    auth: string;
    cli_auth: {
        login: string;
        token: string;
        writes: string;
    };
    description: string;
    endpoints: {
        "GET /api/v1/tools/schema": string;
        "POST /api/v1/tools/execute": string;
    };
    blocked_tools: string[];
    tools: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
        requires_confirmation: boolean;
    }[];
}>;
export declare const toolsRoutes: FastifyPluginAsync;
