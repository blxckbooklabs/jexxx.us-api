/**
 * Central server configuration for JEXXXUS | API.
 * Safe to import at startup — never logs secret values.
 */
export type ApiSurface = "vault" | "full";
/** Which route bundles are mounted. `vault` = account + tools only (OSS default). */
export declare function getApiSurface(): ApiSurface;
export declare function isVaultOnlySurface(): boolean;
export declare function loadCorsOrigins(): string[];
export declare function parseAuthorizedParties(): string[] | undefined;
export declare function getRateLimitConfig(): {
    global: {
        max: number;
        timeWindow: number;
    };
    toolsExecute: {
        max: number;
        timeWindow: number;
    };
};
export type VaultConfigStatus = {
    clerk: boolean;
    supabaseAnon: boolean;
    supabaseServiceRole: boolean;
    loopbackGuard: boolean;
    superAdminConfigured: boolean;
};
export declare function getVaultConfigStatus(): VaultConfigStatus;
export declare function validateVaultStartup(): {
    ok: boolean;
    missing: string[];
};
/** Legacy empire routes (chat, intake, user profiles, obs). Off in vault surface. */
export declare function legacyRoutesEnabled(): boolean;
/** Public AI routes can incur provider cost — disable on self-hosted OSS unless intended. */
export declare function publicAiRoutesEnabled(): boolean;
export declare function observabilityRoutesEnabled(): boolean;
