function parseEnvSuperAdminIds() {
    const raw = process.env.JEXXXUS_SUPER_ADMIN_CLERK_IDS?.trim();
    if (!raw)
        return [];
    return raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
}
export function isSuperAdminClerkUser(userId) {
    const allowlist = new Set(parseEnvSuperAdminIds());
    return allowlist.has(userId);
}
//# sourceMappingURL=super-admin.js.map