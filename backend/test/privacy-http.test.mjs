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

test("protege preferências de contato sem uma sessão válida", async () => {
  const response = await app.inject({ method: "GET", url: "/api/patients/patient-a/contact-preferences" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, "UNAUTHORIZED");
});
