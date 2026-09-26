import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const backendDirectory = dirname(fileURLToPath(import.meta.url));
const schema = await readFile(join(backendDirectory, "../prisma/schema.prisma"), "utf8");
const migrationsDirectory = join(backendDirectory, "../prisma/migrations");
const migrationSql = await Promise.all(
  (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(async (entry) => readFile(join(migrationsDirectory, entry.name, "migration.sql"), "utf8")),
);

const ownershipRelations = [
  ["contact_consents", "patient_id", "patients"],
  ["recovery_opportunities", "patient_id", "patients"],
  ["recovery_sequences", "patient_id", "patients"],
  ["recovery_sequences", "opportunity_id", "recovery_opportunities"],
  ["communication_events", "patient_id", "patients"],
  ["communication_events", "opportunity_id", "recovery_opportunities"],
  ["communication_events", "sequence_id", "recovery_sequences"],
];

test("the Sarah migration declares composite tenant ownership constraints", () => {
  const sql = migrationSql.find((entry) => entry.includes('CREATE TABLE "communication_events"'));
  for (const [table, column, target] of ownershipRelations) {
    assert.match(sql, new RegExp(`CONSTRAINT "${table}_tenant_id_${column}_fkey" FOREIGN KEY \\(\"tenant_id\", \"${column}\"\\) REFERENCES \"${target}\"\\(\"tenant_id\", \"id\"\\)`));
  }
});

test("fresh migrations reject cross-tenant recovery links and preserve audit and active-sequence rules", async (t) => {
  const database = new PGlite();
  try {
    for (const sql of migrationSql) await database.exec(sql);
    await database.exec(`
      INSERT INTO tenants (id, name, slug, email, updated_at) VALUES
        ('a', 'Clinic A', 'clinic-a', 'a@example.test', now()),
        ('b', 'Clinic B', 'clinic-b', 'b@example.test', now());
      INSERT INTO patients (id, tenant_id, name, record_number, updated_at) VALUES
        ('patient-a', 'a', 'Patient A', '1', now()),
        ('patient-b', 'b', 'Patient B', '1', now());
      INSERT INTO recovery_opportunities (id, tenant_id, patient_id, source_type, source_id) VALUES
        ('opportunity-a', 'a', 'patient-a', 'TEST', 'a'),
        ('opportunity-b', 'b', 'patient-b', 'TEST', 'b');
      INSERT INTO recovery_sequences (id, tenant_id, patient_id, opportunity_id) VALUES
        ('sequence-a', 'a', 'patient-a', 'opportunity-a'),
        ('sequence-b', 'b', 'patient-b', 'opportunity-b');
    `);

    const rows = {
      contact_consents: { id: "consent-a", tenant_id: "a", patient_id: "patient-a", channel: "WHATSAPP", purpose: "RECOVERY", source: "TEST", policy_version: "1" },
      recovery_opportunities: { id: "opportunity-new", tenant_id: "a", patient_id: "patient-a", source_type: "TEST", source_id: "new" },
      recovery_sequences: { id: "sequence-new", tenant_id: "a", patient_id: "patient-a", opportunity_id: "opportunity-a", status: "PAUSED" },
      communication_events: { id: "event-a", tenant_id: "a", patient_id: "patient-a", opportunity_id: "opportunity-a", sequence_id: "sequence-a", channel: "WHATSAPP", direction: "OUTBOUND", kind: "TEST", actor_type: "SYSTEM" },
    };
    const insert = (table, row) => database.query(
      `INSERT INTO "${table}" (${Object.keys(row).map((column) => `"${column}"`).join(", ")}) VALUES (${Object.keys(row).map((_, index) => `$${index + 1}`).join(", ")})`,
      Object.values(row),
    );

    for (const [table, column] of ownershipRelations) {
      await t.test(`${table}.${column} rejects another tenant's row`, async () => {
        const row = { ...rows[table], id: `invalid-${table}-${column}`, [column]: rows[table][column].replace(/-a$/, "-b") };
        await assert.rejects(insert(table, row), { code: "23503", constraint: `${table}_tenant_id_${column}_fkey` });
      });
    }
    await t.test("same-tenant links and events without sequences are accepted", async () => {
      for (const [table, row] of Object.entries(rows)) await insert(table, row);
      await insert("communication_events", { ...rows.communication_events, id: "event-no-sequence", sequence_id: null });
    });
    await t.test("ownership updates cannot introduce a cross-tenant patient", async () => {
      await assert.rejects(database.exec(`UPDATE contact_consents SET patient_id = 'patient-b' WHERE id = 'consent-a'`), { code: "23503" });
    });
    await t.test("a second active sequence is rejected", async () => {
      await assert.rejects(insert("recovery_sequences", { ...rows.recovery_sequences, id: "duplicate-active", status: "ACTIVE" }), { code: "23505", constraint: "recovery_sequences_one_active_per_patient" });
    });
    await t.test("events remain append-only with immutable timestamps", async () => {
      await assert.rejects(database.exec(`UPDATE communication_events SET kind = 'EDITED' WHERE id = 'event-a'`), /append-only/);
      await assert.rejects(database.exec(`UPDATE communication_events SET occurred_at = occurred_at + interval '1 second' WHERE id = 'event-a'`), /timestamps are immutable/);
      await assert.rejects(database.exec(`DELETE FROM communication_events WHERE id = 'event-a'`), /append-only/);
      await assert.rejects(database.exec(`DELETE FROM recovery_sequences WHERE id = 'sequence-a'`));
    });
  } finally {
    await database.close();
  }
});

function model(name) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, "m"));
  assert.ok(match, `${name} must be declared in the Prisma schema`);
  return match[1];
}

test("Sarah persistence models are tenant-scoped and indexed by patient", () => {
  for (const name of ["ContactConsent", "RecoveryOpportunity", "RecoverySequence", "CommunicationEvent"]) {
    const body = model(name);
    assert.match(body, /tenantId\s+String\s+@map\("tenant_id"\)/, `${name} needs tenantId`);
    assert.match(
      body,
      /tenant\s+Tenant\s+@relation\(fields: \[tenantId\], references: \[id\], onDelete: Restrict\)/,
      `${name} needs a restrictive tenant foreign key`,
    );
    assert.match(body, /patientId\s+String\s+@map\("patient_id"\)/, `${name} needs patientId`);
    assert.match(body, /@@index\(\[tenantId, patientId\]\)/, `${name} needs a tenant-scoped patient index`);
  }
});

test("consent retains WhatsApp purpose and a revocable capture trail", () => {
  const body = model("ContactConsent");
  for (const field of ["channel", "purpose", "capturedAt", "source", "policyVersion", "revokedAt", "revocationSource"]) {
    assert.match(body, new RegExp(`\\b${field}\\b`), `ContactConsent needs ${field}`);
  }
});

test("communication events retain only redacted content and an immutable occurrence time", () => {
  const body = model("CommunicationEvent");
  assert.match(body, /contentRedacted\s+String\?\s+@map\("content_redacted"\)/);
  assert.doesNotMatch(body, /\bcontent\s+String/);
  assert.match(body, /occurredAt\s+DateTime\s+@default\(now\(\)\)\s+@map\("occurred_at"\)/);
  assert.doesNotMatch(body, /occurredAt[\s\S]*?@updatedAt/);

  const sarahMigration = migrationSql.find((sql) => sql.includes('CREATE TABLE "communication_events"'));
  assert.ok(sarahMigration, "Sarah migration must create communication_events");
  assert.match(sarahMigration, /CREATE TRIGGER "communication_events_occurred_at_immutable"/);
  assert.match(sarahMigration, /OLD\."occurred_at" IS DISTINCT FROM NEW\."occurred_at"/);
});

test("the database prevents two active recovery sequences for one patient", () => {
  const sequence = model("RecoverySequence");
  assert.match(sequence, /status\s+RecoverySequenceStatus\s+@default\(ACTIVE\)/);
  assert.match(schema, /enum RecoverySequenceStatus \{\s+ACTIVE\s+PAUSED\s+ENDED\s+\}/);

  const sarahMigration = migrationSql.find((sql) => sql.includes('CREATE TABLE "recovery_sequences"'));
  assert.ok(sarahMigration, "Sarah migration must create recovery_sequences");
  assert.match(
    sarahMigration,
    /CREATE UNIQUE INDEX "recovery_sequences_one_active_per_patient"[\s\S]*?\("patient_id"\)[\s\S]*?WHERE "status" = 'ACTIVE'/,
  );
});
