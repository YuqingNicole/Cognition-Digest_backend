import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";

const TOKEN = process.env.DIGEST_TOKEN?.split(",")[0]?.trim() || "dev-token-1";

describe("/api/report/:id", () => {
  const app = buildApp();
  let server: any;

  beforeAll(async () => {
    server = await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects unauthorized", async () => {
    const res = await request(`http://localhost:${(app.server.address() as any).port}`).get("/api/report/r-1");
    expect(res.status).toBe(401);
    expect(res.body.message).toBeDefined();
  });

  it("returns placeholder on GET and upserts on POST", async () => {
    const base = `http://localhost:${(app.server.address() as any).port}`;
    const auth = { Authorization: `Bearer ${TOKEN}` };

    const r1 = await request(base).get("/api/report/r-1").set(auth);
    expect(r1.status).toBe(200);
    expect(r1.body.id).toBe("r-1");
    expect(r1.body.report === null || typeof r1.body.report === "object").toBe(true);

    const p1 = await request(base)
      .post("/api/report/r-1")
      .set(auth)
      .send({ title: "Updated digest title" });
    expect(p1.status).toBe(200);
    expect(p1.body.ok).toBe(true);

    const r2 = await request(base).get("/api/report/r-1").set(auth);
    expect(r2.status).toBe(200);
    expect(r2.body.report?.title).toBe("Updated digest title");
  });
});
