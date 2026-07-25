/**
 * Central server configuration for JEXXXUS | API.
 * Safe to import at startup — never logs secret values.
 */

export type ApiSurface = "vault" | "full";

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const DISABLED = new Set(["off", "false", "0", "disabled", "none"]);

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  if (TRUTHY.has(raw)) return true;
  if (DISABLED.has(raw)) return false;
  return defaultValue;
}

/** Which route bundles are mounted. `vault` = account + tools only (OSS default). */
export function getApiSurface(): ApiSurface {
  const raw = process.env.JEXXXUS_API_SURFACE?.trim().toLowerCase();
  if (raw === "full" || raw === "all" || raw === "empire") return "full";
  if (raw === "vault" || raw === "account") return "vault";
  // Backward compatible: existing empire deploys keep all routes unless opted in.
  return "full";
}

export function isVaultOnlySurface(): boolean {
  return getApiSurface() === "vault";
}

export function loadCorsOrigins(): string[] {
  const raw = process.env.JEXXXUS_CORS_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  return [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://jexxx.us",
    "https://bible.jexxx.us",
    "https://api.jexxx.us",
    "https://api-vm.jexxx.us",
    "https://blxckchat.jexxx.us",
    "https://blxckbook.jexxx.us",
    "https://dxsh.blxckbook.jexxx.us",
    "https://nxt.jexxx.us",
    "https://blackbook.love",
    "https://admin.blackbook.love",
    "https://jexxxus.com",
    "https://www.jexxxus.com",
  ];
}

export function parseAuthorizedParties(): string[] | undefined {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  if (!raw) return undefined;
  const parties = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parties.length > 0 ? parties : undefined;
}

export function getRateLimitConfig() {
  const max = Number.parseInt(process.env.JEXXXUS_RATE_LIMIT_MAX ?? "120", 10);
  const windowMs = Number.parseInt(process.env.JEXXXUS_RATE_LIMIT_WINDOW_MS ?? "60000", 10);
  const toolMax = Number.parseInt(process.env.JEXXXUS_TOOL_RATE_LIMIT_MAX ?? "30", 10);
  const ttsMax = Number.parseInt(process.env.JEXXXUS_TTS_RATE_LIMIT_MAX ?? "40", 10);
  return {
    global: {
      max: Number.isFinite(max) && max > 0 ? max : 120,
      timeWindow: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
    },
    toolsExecute: {
      max: Number.isFinite(toolMax) && toolMax > 0 ? toolMax : 30,
      timeWindow: 60_000,
    },
    /** Public Edge TTS — stricter than global to limit scrape/abuse. */
    tts: {
      max: Number.isFinite(ttsMax) && ttsMax > 0 ? ttsMax : 40,
      timeWindow: 60_000,
    },
  };
}

export type VaultConfigStatus = {
  clerk: boolean;
  supabaseAnon: boolean;
  supabaseServiceRole: boolean;
  loopbackGuard: boolean;
  superAdminConfigured: boolean;
};

export function getVaultConfigStatus(): VaultConfigStatus {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
  const anon =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_KEY?.trim() ||
    "";

  const accountApi = process.env.JEXXXUS_ACCOUNT_API?.trim().toLowerCase() ?? "off";

  return {
    clerk: Boolean(process.env.CLERK_SECRET_KEY?.trim()),
    supabaseAnon: Boolean(supabaseUrl && anon),
    supabaseServiceRole: Boolean(supabaseUrl && service),
    loopbackGuard: DISABLED.has(accountApi),
    superAdminConfigured: Boolean(process.env.JEXXXUS_SUPER_ADMIN_CLERK_IDS?.trim()),
  };
}

export function validateVaultStartup(): { ok: boolean; missing: string[] } {
  const status = getVaultConfigStatus();
  const missing: string[] = [];
  if (!status.clerk) missing.push("CLERK_SECRET_KEY");
  if (!status.supabaseAnon) missing.push("SUPABASE_URL + SUPABASE_ANON_KEY");
  if (!status.loopbackGuard) missing.push("JEXXXUS_ACCOUNT_API=off (prevents HTTP loopback)");
  return { ok: missing.length === 0, missing };
}

/** Legacy empire routes (chat, intake, user profiles, obs). Off in vault surface. */
export function legacyRoutesEnabled(): boolean {
  return !isVaultOnlySurface() && envFlag("JEXXXUS_ENABLE_LEGACY_ROUTES", true);
}

/** Public AI routes can incur provider cost — disable on self-hosted OSS unless intended. */
export function publicAiRoutesEnabled(): boolean {
  if (isVaultOnlySurface()) return false;
  return envFlag("JEXXXUS_ENABLE_PUBLIC_AI_ROUTES", true);
}

/**
 * Public Edge TTS (Microsoft neural via edge-tts / msedge-tts).
 * No API key / no HF bill — safe on vault surface for bible.jexxx.us.
 * Default ON. Set JEXXXUS_ENABLE_PUBLIC_TTS_ROUTES=false to disable.
 */
export function publicTtsRoutesEnabled(): boolean {
  return envFlag("JEXXXUS_ENABLE_PUBLIC_TTS_ROUTES", true);
}

export function observabilityRoutesEnabled(): boolean {
  if (isVaultOnlySurface()) return false;
  return envFlag("JEXXXUS_ENABLE_OBSERVABILITY", false);
}