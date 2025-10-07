import { FastifyPluginAsync } from "fastify";
import oauthPlugin from "@fastify/oauth2";
import jwt from "jsonwebtoken";

const { GOOGLE_CONFIGURATION } = oauthPlugin as any;

const SESSION_COOKIE = "session";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const callbackUri = `${baseUrl.replace(/\/$/, "")}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    fastify.log.warn("Google OAuth not configured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  } else {
    await fastify.register(oauthPlugin, {
      name: "googleOAuth2",
      scope: ["openid", "email", "profile"],
      credentials: {
        client: { id: clientId, secret: clientSecret },
        auth: GOOGLE_CONFIGURATION,
      },
      startRedirectPath: "/auth/google",
      callbackUri,
    } as any);

    fastify.get("/auth/google/callback", async (req, reply) => {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        return reply.code(500).send({ message: "SERVER_MISCONFIGURED: missing SESSION_SECRET" });
      }

      // Exchange code for tokens
      // Type cast to any due to plugin typing name binding
      const tokenResponse = await (fastify as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      const { token } = tokenResponse as { token: any };

      // Fetch userinfo using access token
      const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!userinfoRes.ok) {
        return reply.code(401).send({ message: "Failed to fetch Google userinfo" });
      }
      const profile = (await userinfoRes.json()) as { sub: string; email?: string; name?: string; picture?: string };

      // Issue our own session JWT
      const sessionJwt = jwt.sign(
        { sub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture, provider: "google" },
        secret,
        { expiresIn: "30d" }
      );

      // Set cookie
      reply.setCookie(SESSION_COOKIE, sessionJwt, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      // Redirect to home or docs
      const redirectTo = (req.query as any)?.redirect || "/";
      return reply.redirect(typeof redirectTo === "string" ? redirectTo : "/");
    });
  }

  // Get current user info from session
  fastify.get("/auth/me", async (req, reply) => {
    const sessionJwt = req.cookies?.[SESSION_COOKIE] as string | undefined;
    const secret = process.env.SESSION_SECRET;

    if (!secret || !sessionJwt) {
      return reply.code(401).send({ message: "Not authenticated" });
    }

    try {
      const decoded = jwt.verify(sessionJwt, secret) as {
        sub: string;
        email?: string;
        name?: string;
        picture?: string;
        provider: string;
      };

      return reply.code(200).send({
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        provider: decoded.provider,
      });
    } catch (error) {
      return reply.code(401).send({ message: "Invalid or expired session" });
    }
  });

  // Simple logout route
  fastify.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(200).send({ ok: true });
  });
};
