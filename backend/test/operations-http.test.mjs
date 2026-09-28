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

for (const path of ["/api/inventory", "/api/documents", "/api/integrations"]) {
  test(`${path} protege os dados da clínica`, async () => {
    const response = await app.inject({ method: "GET", url: path });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, "UNAUTHORIZED");
  });
}

test("a política de integrações permite gestão clínica e reserva perfis de consulta", async () => {
  const { CLINIC_INTEGRATION_ROLES, PLATFORM_INTEGRATION_ROLES } = await import("../src/routes/operations.ts");
  const { requireRole } = await import("../src/lib/middleware.ts");
  assert.deepEqual(PLATFORM_INTEGRATION_ROLES, ["PLATFORM_OWNER"]);
  assert.deepEqual(CLINIC_INTEGRATION_ROLES, ["OWNER", "ADMIN", "MANAGER"]);
  const guard = requireRole([...CLINIC_INTEGRATION_ROLES, ...PLATFORM_INTEGRATION_ROLES]);
  const denied = { status: 0, payload: null, code(value) { this.status = value; return this; }, send(value) { this.payload = value; return this; } };
  await guard({ user: { role: "RECEPTIONIST" } }, denied);
  assert.equal(denied.status, 403);
  assert.equal(denied.payload.code, "FORBIDDEN");
  const allowed = { status: 0, code(value) { this.status = value; return this; }, send() { throw new Error("owner não deve ser bloqueado"); } };
  await guard({ user: { role: "OWNER" } }, allowed);
  assert.equal(allowed.status, 0);
  await guard({ user: { role: "PLATFORM_OWNER" } }, allowed);
  assert.equal(allowed.status, 0);
});
