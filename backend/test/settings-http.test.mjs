import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.DATABASE_URL ||= "postgresql://bhon:bhon@localhost:5432/bhon";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

const { buildApp } = await import("../src/app.ts");
const app = await buildApp({
  logger: false,
  cookieSecret: "test-only-cookie-secret-with-32-characters",
  allowedOrigins: ["https://app.bhon.test"],
});
await app.ready();

after(async () => { await app.close(); });

test("configurações exigem uma sessão autenticada", async () => {
  const response = await app.inject({ method: "GET", url: "/api/settings" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, "UNAUTHORIZED");
});

test("criação de sala exige uma sessão autenticada", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/rooms",
    headers: { origin: "https://app.bhon.test" },
    payload: { name: "Consultório 01" },
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, "UNAUTHORIZED");
});

test("indicadores exigem uma sessão autenticada", async () => {
  const response = await app.inject({ method: "GET", url: "/api/indicators?period=MONTH" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, "UNAUTHORIZED");
});
