function parseEnvSuperAdminIds(): string[] {
  const raw = process.env.JEXXXUS_SUPER_ADMIN_CLERK_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isSuperAdminClerkUser(userId: string): boolean {
  const allowlist = new Set<string>(parseEnvSuperAdminIds());
  return allowlist.has(userId);
}