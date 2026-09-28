import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.DATABASE_URL ||= "postgresql://bhon:bhon@localhost:5432/bhon";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

const { buildApp } = await import("../src/app.ts");
const app = await buildApp({ logger: false, cookieSecret: "test-only-cookie-secret-with-32-characters", allowedOrigins: ["https://app.bhon.test"] });
await app.ready();
after(async () => { await app.close(); });

test("internal R$ 1 checkout refuses unauthenticated access", async () => {
  const response = await app.inject({ method: "POST", url: "/api/platform/billing/test-checkout" });
  assert.equal(response.statusCode, 401, response.body);
  assert.equal(response.json().code, "UNAUTHORIZED");
});
