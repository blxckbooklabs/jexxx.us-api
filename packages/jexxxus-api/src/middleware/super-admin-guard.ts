import { isSuperAdminClerkUser } from "../lib/super-admin.js";

/** Restrict route to JEXXXUS super-admin Clerk IDs from env allowlist. */
export async function requireSuperAdmin(request: any, reply: any): Promise<boolean> {
  const userId = request.userId;
  if (!userId || !isSuperAdminClerkUser(userId)) {
    reply.status(403).send({
      error: "forbidden",
      message: "Super-admin access required.",
    });
    return false;
  }
  return true;
}