import { createClerkClient } from "@clerk/backend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadCliModule } from "./cli-loader.js";
import { isSuperAdminClerkUser } from "./super-admin.js";
import {
  createUserSupabaseClient,
  loadApiSupabaseEnv,
} from "./user-supabase.js";

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

export type AccountSessionResult =
  | { ok: true; session: AuthenticatedAccountSession }
  | { ok: false; reason: string; message: string };

function loadOperatorEnv(): { supabaseUrl: string; supabaseKey: string } | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_KEY?.trim() ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return { supabaseUrl, supabaseKey };
}

function createOperatorSchemaClient(
  env: { supabaseUrl: string; supabaseKey: string },
  schema: "api" | "public",
) {
  return createClient(env.supabaseUrl, env.supabaseKey, {
    db: { schema },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Build RLS-scoped vault session from a Clerk Bearer token (BLXCKCHAT / CLI parity).
 */
export async function resolveBearerAccountSession(
  userId: string,
  accessToken: string,
): Promise<AccountSessionResult> {
  const env = loadApiSupabaseEnv();
  if (!env) {
    return {
      ok: false,
      reason: "missing_user_env",
      message:
        "SUPABASE_URL and SUPABASE_ANON_KEY must be configured on JEXXXUS | API.",
    };
  }

  let creds: Credentials = {
    userId,
    email: "",
    accessToken,
    refreshToken: "",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    refreshedAt: new Date().toISOString(),
  };

  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
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
  } catch {
    // Proceed with userId-only creds when Clerk profile fetch fails.
  }

  const getAccessToken = async () => accessToken;
  const isSuperAdmin = isSuperAdminClerkUser(userId);
  const operatorEnv = isSuperAdmin ? loadOperatorEnv() : null;

  const session: AuthenticatedAccountSession = {
    creds,
    blxckbook: createUserSupabaseClient(
      env.supabaseUrl,
      env.supabaseAnonKey,
      getAccessToken,
      "blxckbook",
    ),
    nxt: createUserSupabaseClient(
      env.supabaseUrl,
      env.supabaseAnonKey,
      getAccessToken,
      "nxt",
    ),
    tv: createUserSupabaseClient(
      env.supabaseUrl,
      env.supabaseAnonKey,
      getAccessToken,
      "blxckbook",
    ),
    isSuperAdmin,
  };

  if (isSuperAdmin && operatorEnv) {
    session.operator = {
      blxckbook: createOperatorSchemaClient(operatorEnv, "api") as SupabaseClient,
      nxt: createOperatorSchemaClient(operatorEnv, "public") as SupabaseClient,
      tv: createOperatorSchemaClient(operatorEnv, "api") as SupabaseClient,
    };
  }

  return { ok: true, session };
}

export async function loadAccountQueryModule() {
  return loadCliModule<{
    executeAccountQuery: (
      session: AuthenticatedAccountSession,
      args: Record<string, unknown>,
    ) => Promise<string>;
    fetchAccountSummary: (
      session: AuthenticatedAccountSession,
      asUserId?: string,
    ) => Promise<unknown>;
  }>("lib/account-data/account-query.js");
}

export async function loadVaultSessionHelpers() {
  return loadCliModule<{
    resolveVaultClient: (
      session: AuthenticatedAccountSession,
      target: "blxckbook" | "nxt",
      asUserId?: string,
    ) => { client: SupabaseClient; effectiveUserId: string; elevated: boolean };
    resolveTvClient: (
      session: AuthenticatedAccountSession,
      asUserId?: string,
    ) => { client: SupabaseClient; effectiveUserId: string; elevated: boolean };
  }>("lib/account-data/session.js");
}