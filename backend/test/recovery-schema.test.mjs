import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const backendDirectory = dirname(fileURLToPath(import.meta.url));
const schema = await readFile(join(backendDirectory, "../prisma/schema.prisma"), "utf8");
const migrationsDirectory = join(backendDirectory, "../prisma/migrations");
const migrationSql = await Promise.all(
  (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => readFile(join(migrationsDirectory, entry.name, "migration.sql"), "utf8")),
);

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
