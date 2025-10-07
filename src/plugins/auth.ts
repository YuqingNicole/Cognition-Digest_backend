import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

function parseAllowedTokens(envValue: string | undefined): Set<string> {
  if (!envValue) return new Set();
  return new Set(
    envValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const authPluginImpl: FastifyPluginAsync = async (fastify) => {
  const allowed = parseAllowedTokens(process.env.DIGEST_TOKEN);
  const SESSION_COOKIE = "session";
  const SESSION_SECRET = process.env.SESSION_SECRET;

  // Enforce auth as early as possible - use preHandler for better control
  fastify.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for docs and openapi using raw URL
    const url = req.url;
    if (url.startsWith("/docs") || url === "/openapi.yaml" || url === "/healthz" || url.startsWith("/auth/")) {
      return;
    }

    // 1) Try session cookie (Google login)
    const sessionJwt = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (SESSION_SECRET && sessionJwt) {
      try {
        jwt.verify(sessionJwt, SESSION_SECRET);
        return; // authorized via session
      } catch {}
    }

    // 2) Fallback: token from header/cookie for legacy DIGEST_TOKEN
    const header = req.headers["authorization"]; // Bearer <token>
    let token: string | undefined;
    if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
      token = header.slice(7).trim();
    }
    if (!token) {
      const cookieToken = req.cookies?.["digest-token"] as string | undefined;
      if (cookieToken) token = cookieToken;
    }

    // Check token validity
    if (!token) {
      // No token provided at all
      return reply.code(401).send({ message: "Unauthorized" });
    }

    // If DIGEST_TOKEN is configured, validate against it
    if (allowed.size > 0 && !allowed.has(token)) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });
};

// Export as non-encapsulated plugin so hooks apply globally
export const authPlugin = fp(authPluginImpl, { name: "auth-plugin" });
