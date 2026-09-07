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

test("health de processo responde sem consultar o banco", async () => {
  const response = await app.inject({ method: "GET", url: "/health/live" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().status, "ok");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "SAMEORIGIN");
});

test("rota clínica rejeita requisição sem sessão antes de acessar dados", async () => {
  const response = await app.inject({ method: "GET", url: "/api/patients" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, "UNAUTHORIZED");
});

test("mutação com cookie sem origem confiável é bloqueada", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: { cookie: "bhon_session=token-invalido" },
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().code, "UNTRUSTED_ORIGIN");
});

test("contrato de login rejeita payload incompleto", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { origin: "https://app.bhon.test" },
    payload: { email: "operador@bhon.test" },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, "VALIDATION_ERROR");
});

test("CORS rejeita origem externa com resposta segura", async () => {
  const response = await app.inject({ method: "GET", url: "/health/live", headers: { origin: "https://malicioso.test" } });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().code, "ORIGIN_NOT_ALLOWED");
  assert.equal(response.body.includes("stack"), false);
});

