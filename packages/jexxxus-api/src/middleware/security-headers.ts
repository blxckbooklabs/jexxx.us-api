/**
 * Baseline HTTP security headers for a public-facing API gateway.
 * Complements Clerk JWT verification — does not replace it.
 */
export async function registerSecurityHeaders(server: any): Promise<void> {
  server.addHook("onSend", async (_request: any, reply: any, payload: unknown) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("Cross-Origin-Resource-Policy", "same-site");
    // API returns JSON — discourage MIME sniffing and caching of auth responses.
    if (reply.statusCode === 401 || reply.statusCode === 403) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });
}