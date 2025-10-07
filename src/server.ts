import "dotenv/config";
import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT || 4000);

app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`Server listening on http://localhost:${port}`);
  app.log.info(`OpenAPI: http://localhost:${port}/openapi.yaml`);
  app.log.info(`Docs:    http://localhost:${port}/docs`);
});
