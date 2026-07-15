import { verifyToken } from "@clerk/backend";
import { parseAuthorizedParties } from "../lib/server-config.js";

const CLOCK_SKEW_MS = 10_000;

export const authMiddleware = async (request: any, reply: any) => {
  const authHeader = request.headers.authorization as string | undefined;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "unauthorized",
      message: "Authorization: Bearer <clerk_session_jwt> required.",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return reply.status(401).send({ error: "unauthorized", message: "Empty Bearer token." });
  }

  if (!process.env.CLERK_SECRET_KEY) {
    return reply.status(503).send({
      error: "misconfigured",
      message: "CLERK_SECRET_KEY is not configured on JEXXXUS | API.",
    });
  }

  try {
    const authorizedParties = parseAuthorizedParties();
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: CLOCK_SKEW_MS,
      ...(authorizedParties ? { authorizedParties } : {}),
    });

    if (!verified?.sub) {
      return reply.status(401).send({ error: "unauthorized", message: "Invalid Clerk token." });
    }

    request.userId = verified.sub;
    request.accessToken = token;
  } catch {
    return reply.status(401).send({
      error: "unauthorized",
      message:
        "Token verification failed. Refresh via `jexxxus auth token` or `jexxxus auth login`.",
    });
  }
};