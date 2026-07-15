import { resolveBearerAccountSession, } from "./account-session.js";
export async function requireAccountSession(request, reply) {
    const userId = request.userId;
    const accessToken = request.accessToken;
    if (!userId || !accessToken) {
        reply.status(401).send({ error: "unauthorized" });
        return null;
    }
    const resolved = await resolveBearerAccountSession(userId, accessToken);
    if (resolved.ok) {
        return resolved.session;
    }
    const failure = resolved;
    const status = failure.reason === "missing_user_env" ? 503 : 401;
    reply.status(status).send({
        error: failure.reason,
        message: failure.message,
    });
    return null;
}
//# sourceMappingURL=require-account-session.js.map