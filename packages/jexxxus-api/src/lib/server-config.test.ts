import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getApiSurface,
  getVaultConfigStatus,
  validateVaultStartup,
} from "./server-config.js";

const env = process.env;

describe("server-config", () => {
  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("defaults to full surface for backward compatibility", () => {
    delete process.env.JEXXXUS_API_SURFACE;
    expect(getApiSurface()).toBe("full");
  });

  it("supports vault-only surface for OSS self-hosting", () => {
    process.env.JEXXXUS_API_SURFACE = "vault";
    expect(getApiSurface()).toBe("vault");
  });

  it("requires clerk, supabase anon, and loopback guard", () => {
    process.env.CLERK_SECRET_KEY = "sk_test";
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.JEXXXUS_ACCOUNT_API = "off";

    const status = getVaultConfigStatus();
    expect(status.clerk).toBe(true);
    expect(status.supabaseAnon).toBe(true);
    expect(status.loopbackGuard).toBe(true);
    expect(validateVaultStartup().ok).toBe(true);
  });
});