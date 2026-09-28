import assert from "node:assert/strict";
import test, { after } from "node:test";

const { createActivationService, getActivationSnapshot } = await import("../src/domain/activation.ts");
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

function createDb() {
  const events = [];
  return {
    events,
    onboardingProgress: {
      findUnique: async ({ where }) => where.tenantId === "tenant-a" ? null : { dismissedAt: new Date("2026-09-28") },
      upsert: async ({ create, update, where }) => ({ tenantId: where.tenantId, ...create, ...update }),
    },
    patient: { count: async ({ where }) => where.tenantId === "tenant-a" ? 0 : 3 },
    user: { count: async ({ where }) => where.tenantId === "tenant-a" ? 1 : 2 },
    appointment: { count: async ({ where }) => where.tenantId === "tenant-a" ? 0 : 1 },
    opportunity: { count: async ({ where }) => where.tenantId === "tenant-a" ? 0 : 1 },
    activationEvent: {
      create: async ({ data }) => { events.push(data); return data; },
    },
  };
}

test("mantém pacientes como próxima etapa quando a clínica ainda não tem registros", () => {
  const snapshot = getActivationSnapshot(null, {
    patients: 0,
    teamMembers: 1,
    appointments: 0,
    opportunities: 0,
  });

  assert.equal(snapshot.steps.find((step) => step.key === "PATIENTS")?.complete, false);
  assert.equal(snapshot.nextStep.key, "PROFILE");
});

test("não inclui metadados livres no contrato de evento de ativação", () => {
  const snapshot = getActivationSnapshot(null, {
    patients: 0,
    teamMembers: 1,
    appointments: 0,
    opportunities: 0,
  });

  assert.deepEqual(snapshot.eventContract, {
    acceptsOnly: [
      "ONBOARDING_OPENED",
      "CSV_TEMPLATE_DOWNLOADED",
      "PATIENT_IMPORT_COMPLETED",
      "DEMO_LOADED",
      "DEMO_REMOVED",
      "TEAM_CREATED",
      "AGENDA_OPENED",
      "OPPORTUNITY_PRIORITIZED",
      "SARAH_MESSAGE_PREPARED",
    ],
  });
});

test("registra somente o tipo permitido e nunca recebe metadados clínicos", async () => {
  const db = createDb();
  const service = createActivationService(db);

  await service.recordEvent({
    tenantId: "tenant-a",
    actorUserId: "owner-a",
    type: "CSV_TEMPLATE_DOWNLOADED",
    metadata: { phone: "+5511999999999", message: "conteúdo clínico" },
  });

  assert.deepEqual(db.events, [{
    tenantId: "tenant-a",
    actorUserId: "owner-a",
    type: "CSV_TEMPLATE_DOWNLOADED",
  }]);
});

test("calcula a ativação apenas com os registros do tenant solicitado", async () => {
  const service = createActivationService(createDb());

  const tenantA = await service.getSnapshot("tenant-a");
  const tenantB = await service.getSnapshot("tenant-b");

  assert.equal(tenantA.steps.find((step) => step.key === "PATIENTS")?.complete, false);
  assert.equal(tenantB.steps.find((step) => step.key === "PATIENTS")?.complete, true);
  assert.equal(tenantA.dismissed, false);
  assert.equal(tenantB.dismissed, true);
});

test("protege o roteiro de ativação sem uma sessão válida", async () => {
  const response = await app.inject({ method: "GET", url: "/api/onboarding" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, "UNAUTHORIZED");
});
