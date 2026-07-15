import { createClient } from "@supabase/supabase-js";
const SCHEMA_MAP = {
    blxckbook: "api",
    nxt: "public",
};
export function createUserSupabaseClient(supabaseUrl, supabaseAnonKey, getAccessToken, target = "blxckbook") {
    return createClient(supabaseUrl, supabaseAnonKey, {
        db: { schema: SCHEMA_MAP[target] },
        accessToken: getAccessToken,
    });
}
export function loadApiSupabaseEnv() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        "";
    if (!supabaseUrl || !supabaseAnonKey)
        return null;
    return { supabaseUrl, supabaseAnonKey };
}
//# sourceMappingURL=user-supabase.js.map