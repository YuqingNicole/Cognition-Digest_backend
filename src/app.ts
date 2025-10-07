import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { authPlugin } from "./plugins/auth.js";
import { errorHandlerPlugin } from "./plugins/errorHandler.js";
import { reportRoutes } from "./routes/report.js";
import { authRoutes } from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp() {
  const app = Fastify({ logger: true });

  // CORS configuration for frontend integration
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  void app.register(cors, {
    origin: frontendUrl,
    credentials: true, // Allow cookies to be sent
  });

  // Register global plugins first - these apply to all routes
  void app.register(cookie);
  void app.register(errorHandlerPlugin);
  void app.register(authPlugin); // Auth hook applies globally
  
  // Register routes
  void app.register(authRoutes);
  void app.register(reportRoutes);

  // Public routes (no auth) - registered at root level
  const projectRoot = path.resolve(__dirname, "..", "..");
  const openapiDir = path.join(projectRoot, "openapi");

  app.get("/openapi.yaml", async (_req, reply) => {
    const filePath = path.join(openapiDir, "openapi.yaml");
    const content = await fs.readFile(filePath, "utf8");
    return reply.type("application/yaml").send(content);
  });

  app.get("/docs", async (_req, reply) => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>Cognition Digest API Docs</title>
    <link rel=\"stylesheet\" href=\"https://unpkg.com/swagger-ui-dist@5/swagger-ui.css\" />
    <style>body { margin:0; } #swagger-ui { max-width: 100%; }</style>
  </head>
  <body>
    <div id=\"swagger-ui\"></div>
    <script src=\"https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js\"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`;
    return reply.type("text/html").send(html);
  });

  // Health probe (no auth)
  app.get("/healthz", async (_req, reply) => reply.send({ ok: true }));

  return app;
}
