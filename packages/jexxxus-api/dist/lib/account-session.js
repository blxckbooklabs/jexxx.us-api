import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import { loadCliModule } from "./cli-loader.js";
import { isSuperAdminClerkUser } from "./super-admin.js";
import { createUserSupabaseClient, loadApiSupabaseEnv, } from "./user-supabase.js";
function loadOperatorEnv() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim() ||
        process.env.SUPABASE_KEY?.trim() ||
        "";
    if (!supabaseUrl || !supabaseKey)
        return null;
    return { supabaseUrl, supabaseKey };
}
function createOperatorSchemaClient(env, schema) {
    return createClient(env.supabaseUrl, env.supabaseKey, {
        db: { schema },
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
/**
 * Build RLS-scoped vault session from a Clerk Bearer token (BLXCKCHAT / CLI parity).
 */
export async function resolveBearerAccountSession(userId, accessToken) {
    const env = loadApiSupabaseEnv();
    if (!env) {
        return {
            ok: false,
            reason: "missing_user_env",
            message: "SUPABASE_URL and SUPABASE_ANON_KEY must be configured on JEXXXUS | API.",
        };
    }
    let creds = {
        userId,
        email: "",
        accessToken,
        refreshToken: "",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        refreshedAt: new Date().toISOString(),
    };
    try {
        const clerk = createClerkClient({
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        const user = await clerk.users.getUser(userId);
        const email = user.emailAddresses[0]?.emailAddress ?? "";
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        creds = {
            ...creds,
            email,
            fullName: fullName || undefined,
            username: user.username,
            imageUrl: user.imageUrl,
        };
    }
    catch {
        // Proceed with userId-only creds when Clerk profile fetch fails.
    }
    const getAccessToken = async () => accessToken;
    const isSuperAdmin = isSuperAdminClerkUser(userId);
    const operatorEnv = isSuperAdmin ? loadOperatorEnv() : null;
    const session = {
        creds,
        blxckbook: createUserSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, getAccessToken, "blxckbook"),
        nxt: createUserSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, getAccessToken, "nxt"),
        tv: createUserSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, getAccessToken, "blxckbook"),
        isSuperAdmin,
    };
    if (isSuperAdmin && operatorEnv) {
        session.operator = {
            blxckbook: createOperatorSchemaClient(operatorEnv, "api"),
            nxt: createOperatorSchemaClient(operatorEnv, "public"),
            tv: createOperatorSchemaClient(operatorEnv, "api"),
        };
    }
    return { ok: true, session };
}
export async function loadAccountQueryModule() {
    return loadCliModule("lib/account-data/account-query.js");
}
export async function loadVaultSessionHelpers() {
    return loadCliModule("lib/account-data/session.js");
}
//# sourceMappingURL=account-session.js.map