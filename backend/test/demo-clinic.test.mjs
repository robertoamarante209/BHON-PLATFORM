import assert from "node:assert/strict";
import test from "node:test";

const { loadDemoClinic, removeDemoClinic } = await import("../src/domain/demo-clinic.ts");

function emptyClinicDb() {
  const created = [];
  const deletedLotIds = [];
  return {
    created,
    deletedLotIds,
    patient: {
      count: async () => 0,
      create: async ({ data }) => { const row = { id: "demo-patient", ...data }; created.push(["patient", row]); return row; },
      deleteMany: async ({ where }) => { deletedLotIds.push(where.demoLotId); return { count: 1 }; },
    },
    opportunity: {
      count: async () => 0,
      create: async ({ data }) => { const row = { id: "demo-opportunity", ...data }; created.push(["opportunity", row]); return row; },
      deleteMany: async ({ where }) => { deletedLotIds.push(where.demoLotId); return { count: 1 }; },
    },
    appointment: { count: async () => 0, deleteMany: async ({ where }) => { deletedLotIds.push(where.demoLotId); return { count: 0 }; } },
    followUp: {
      create: async ({ data }) => { const row = { id: "demo-followup", ...data }; created.push(["followUp", row]); return row; },
      deleteMany: async ({ where }) => { deletedLotIds.push(where.demoLotId); return { count: 1 }; },
    },
    demoDataLot: {
      create: async ({ data }) => ({ id: "lot-demo", ...data }),
      findFirst: async ({ where }) => where.tenantId === "tenant-a" ? { id: "lot-demo", tenantId: "tenant-a" } : null,
      delete: async ({ where }) => { deletedLotIds.push(where.id); return { id: where.id }; },
    },
  };
}

test("recusa demonstração quando a clínica já tem dados reais", async () => {
  const db = emptyClinicDb();
  db.patient.count = async () => 1;

  await assert.rejects(() => loadDemoClinic(db, "tenant-real", "owner"), /DEMO_REQUIRES_EMPTY_CLINIC/);
  assert.equal(db.created.length, 0);
});

test("cria e remove somente um lote de demonstração, sem itens de envio", async () => {
  const db = emptyClinicDb();
  const created = await loadDemoClinic(db, "tenant-a", "owner-a");
  await removeDemoClinic(db, "tenant-a", "owner-a");

  assert.equal(created.demoLotId, "lot-demo");
  assert.deepEqual(db.deletedLotIds, ["lot-demo", "lot-demo", "lot-demo", "lot-demo", "lot-demo"]);
  assert.equal(db.created.some(([model]) => model === "notificationOutbox"), false);
});
