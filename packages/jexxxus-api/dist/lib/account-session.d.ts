import { type SupabaseClient } from "@supabase/supabase-js";
type Credentials = {
    userId: string;
    email: string;
    fullName?: string;
    username?: string | null;
    imageUrl?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    refreshedAt: string;
};
export type AuthenticatedAccountSession = {
    creds: Credentials;
    blxckbook: SupabaseClient;
    nxt: SupabaseClient;
    tv: SupabaseClient;
    isSuperAdmin: boolean;
    operator?: {
        blxckbook: SupabaseClient;
        nxt: SupabaseClient;
        tv: SupabaseClient;
    };
};
export type AccountSessionResult = {
    ok: true;
    session: AuthenticatedAccountSession;
} | {
    ok: false;
    reason: string;
    message: string;
};
/**
 * Build RLS-scoped vault session from a Clerk Bearer token (BLXCKCHAT / CLI parity).
 */
export declare function resolveBearerAccountSession(userId: string, accessToken: string): Promise<AccountSessionResult>;
export declare function loadAccountQueryModule(): Promise<{
    executeAccountQuery: (session: AuthenticatedAccountSession, args: Record<string, unknown>) => Promise<string>;
    fetchAccountSummary: (session: AuthenticatedAccountSession, asUserId?: string) => Promise<unknown>;
}>;
export declare function loadVaultSessionHelpers(): Promise<{
    resolveVaultClient: (session: AuthenticatedAccountSession, target: "blxckbook" | "nxt", asUserId?: string) => {
        client: SupabaseClient;
        effectiveUserId: string;
        elevated: boolean;
    };
    resolveTvClient: (session: AuthenticatedAccountSession, asUserId?: string) => {
        client: SupabaseClient;
        effectiveUserId: string;
        elevated: boolean;
    };
}>;
export {};
