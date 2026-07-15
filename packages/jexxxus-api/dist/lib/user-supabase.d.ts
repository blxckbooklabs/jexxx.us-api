import { type SupabaseClient } from "@supabase/supabase-js";
export type DashboardTarget = "blxckbook" | "nxt";
export declare function createUserSupabaseClient(supabaseUrl: string, supabaseAnonKey: string, getAccessToken: () => Promise<string>, target?: DashboardTarget): SupabaseClient;
export declare function loadApiSupabaseEnv(): {
    supabaseUrl: string;
    supabaseAnonKey: string;
} | null;
