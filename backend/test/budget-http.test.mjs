import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

const databaseUrl = process.env.TEST_DATABASE_URL;

test("orçamento persiste com isolamento, permissão, auditoria e aprovação concorrente", { skip: !databaseUrl }, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  const [{ buildApp }, { prisma }] = await Promise.all([import("../src/app.ts"), import("../src/lib/prisma.ts")]);
  const suffix = randomUUID();
  const tenant = await prisma.tenant.create({ data: { name: "Clínica orçamento", slug: `budget-${suffix}`, email: `${suffix}@example.test` } });
  const foreignTenant = await prisma.tenant.create({ data: { name: "Clínica externa", slug: `foreign-${suffix}`, email: `foreign-${suffix}@example.test` } });
  const owner = await prisma.user.create({ data: { tenantId: tenant.id, name: "Gestor", email: `owner-${suffix}@example.test`, emailNormalized: `owner-${suffix}@example.test`, role: "OWNER", permissions: [] } });
  const forbidden = await prisma.user.create({ data: { tenantId: tenant.id, name: "Sem permissão", email: `forbidden-${suffix}@example.test`, emailNormalized: `forbidden-${suffix}@example.test`, role: "ADMIN", permissions: [] } });
  const patient = await prisma.patient.create({ data: { tenantId: tenant.id, recordNumber: `#${suffix.slice(0, 8)}`, name: "Paciente local" } });
  const foreignPatient = await prisma.patient.create({ data: { tenantId: foreignTenant.id, recordNumber: `#${suffix.slice(9, 17)}`, name: "Paciente externo" } });
  const token = `owner-${suffix}`; const forbiddenToken = `forbidden-${suffix}`;
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  await prisma.session.createMany({ data: [
    { tenantId: tenant.id, userId: owner.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 60_000) },
    { tenantId: tenant.id, userId: forbidden.id, tokenHash: hash(forbiddenToken), expiresAt: new Date(Date.now() + 60_000) },
  ] });
  const app = buildApp({ logger: false, cookieSecret: "test-only-cookie-secret-with-32-characters", allowedOrigins: ["https://app.bhon.test"] });
  await app.ready();
  const request = (sessionToken, payload) => app.inject({ method: "POST", url: "/api/budgets", headers: { cookie: `bhon_session=${sessionToken}`, origin: "https://app.bhon.test" }, payload });
  const payload = { patientId: patient.id, title: "Plano clínico", items: [{ description: "Sessão", quantity: 3, unitPrice: 0.1 }], discountAmount: 0.01 };

  const denied = await request(forbiddenToken, payload);
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.json().code, "PERMISSION_REQUIRED");
  const foreign = await request(token, { ...payload, patientId: foreignPatient.id });
  assert.equal(foreign.statusCode, 404);
  assert.equal(foreign.json().code, "PATIENT_NOT_FOUND");
  const suppliedTotal = await request(token, { ...payload, finalAmount: 0.01 });
  assert.equal(suppliedTotal.statusCode, 201);
  assert.notEqual(suppliedTotal.json().finalAmount, "0.01");

  const first = suppliedTotal;
  assert.equal(Number(first.json().totalAmount), 0.30);
  assert.equal(Number(first.json().finalAmount), 0.29);
  assert.equal(await prisma.quoteItem.count({ where: { quoteId: first.json().id } }), 1);
  assert.equal(await prisma.auditLog.count({ where: { resource: "Quote", resourceId: first.json().id, action: "CREATE" } }), 1);
  const second = await request(token, { ...payload, title: "Plano alternativo" });
  assert.equal(second.statusCode, 201);
  const approve = (id) => app.inject({ method: "POST", url: `/api/budgets/${id}/approve`, headers: { cookie: `bhon_session=${token}`, origin: "https://app.bhon.test" } });
  const forbiddenApproval = await app.inject({ method: "POST", url: `/api/budgets/${second.json().id}/approve`, headers: { cookie: `bhon_session=${forbiddenToken}`, origin: "https://app.bhon.test" } });
  assert.equal(forbiddenApproval.statusCode, 403);
  assert.equal(forbiddenApproval.json().code, "PERMISSION_REQUIRED");
  const approvals = await Promise.all([approve(first.json().id), approve(second.json().id)]);
  assert.deepEqual(approvals.map((response) => response.statusCode).sort(), [200, 409]);
  assert.equal(approvals.find((response) => response.statusCode === 409).json().code, "ACTIVE_TREATMENT_EXISTS");
  assert.equal(await prisma.treatment.count({ where: { tenantId: tenant.id, patientId: patient.id } }), 1);
  assert.equal(await prisma.payment.count({ where: { tenantId: tenant.id, patientId: patient.id } }), 1);
  await app.close(); await prisma.$disconnect();
});
