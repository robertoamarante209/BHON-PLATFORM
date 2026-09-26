import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { EventEmitter } from "node:events";
import test, { after, beforeEach } from "node:test";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { hashSessionToken } from "../src/lib/auth.ts";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/recovery_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

const database = new PGlite();
const migrations = new URL("../prisma/migrations/", import.meta.url);
for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  await database.exec(await readFile(new URL(`${entry.name}/migration.sql`, migrations), "utf8"));
}

// Replace only the pg transport. Routes, authentication, Prisma SQL, and migrations are real.
// One acquired connection owns the embedded database until its transaction releases it.
let connectionTail = Promise.resolve();
async function acquire() {
  const previous = connectionTail;
  let release;
  connectionTail = new Promise((resolve) => { release = resolve; });
  await previous;
  return release;
}
async function queryEmbedded(config) {
  const options = typeof config === "string" ? { text: config, values: [] } : config;
  const result = await database.query(options.text, options.values, {
    rowMode: options.rowMode,
    parsers: new Proxy({}, { get: (_target, oid) => options.types?.getTypeParser(Number(oid), "text") || pg.types.getTypeParser(Number(oid), "text") }),
  });
  return { ...result, rowCount: result.affectedRows ?? result.rows.length };
}
const originalQuery = pg.Pool.prototype.query;
const originalConnect = pg.Pool.prototype.connect;
pg.Pool.prototype.query = async function (config) {
  const release = await acquire();
  try { return await queryEmbedded(config); } finally { release(); }
};
pg.Pool.prototype.connect = async function () {
  const release = await acquire();
  return Object.assign(new EventEmitter(), { query: queryEmbedded, release });
};

const { prisma } = await import("../src/lib/prisma.ts");
const { buildApp } = await import("../src/app.ts");
const app = buildApp({ logger: false, cookieSecret: "test-only-cookie-secret-with-32-characters", allowedOrigins: ["https://app.bhon.test"] });
await app.ready();
after(async () => {
  await app.close();
  await prisma.$disconnect();
  pg.Pool.prototype.query = originalQuery;
  pg.Pool.prototype.connect = originalConnect;
  await database.close();
});

beforeEach(async () => {
  await database.exec(`TRUNCATE tenants CASCADE;
    INSERT INTO tenants (id, name, slug, email, status, updated_at) VALUES
      ('a', 'Clinic A', 'a', 'a@example.test', 'ACTIVE', now()), ('b', 'Clinic B', 'b', 'b@example.test', 'ACTIVE', now());
    INSERT INTO patients (id, tenant_id, name, phone, record_number, updated_at) VALUES
      ('patient-a', 'a', 'Patient A', '11999999999', '1', now()), ('patient-b', 'b', 'Patient B', '11888888888', '1', now());
    INSERT INTO recovery_opportunities (id, tenant_id, patient_id, source_type, source_id, priority_score, next_action_at) VALUES
      ('opportunity-a', 'a', 'patient-a', 'BUDGET', 'budget-a', 90, now()),
      ('opportunity-b', 'b', 'patient-b', 'BUDGET', 'budget-b', 100, now());
    INSERT INTO recovery_sequences (id, tenant_id, patient_id, opportunity_id, scheduled_at) VALUES
      ('sequence-a', 'a', 'patient-a', 'opportunity-a', now()), ('sequence-b', 'b', 'patient-b', 'opportunity-b', now());`);
  for (const [id, tenant, role] of [["owner-a", "a", "OWNER"], ["owner-b", "b", "OWNER"], ["reception-a", "a", "RECEPTIONIST"], ["viewer-a", "a", "VIEWER"]]) {
    await database.query(`INSERT INTO users (id, tenant_id, name, email, email_normalized, role, updated_at) VALUES ($1, $2, $1, $1, $1, $3, now())`, [id, tenant, role]);
    await database.query(`INSERT INTO sessions (id, tenant_id, user_id, token_hash, expires_at) VALUES ($1, $2, $1, $3, now() + interval '1 day')`, [id, tenant, hashSessionToken(id)]);
  }
});

const genericText = "Olá! Aqui é Sarah, assistente virtual da clínica. Podemos ajudar com seu próximo atendimento? Se preferir, solicite atendimento humano ou responda SAIR.";
const consentBody = { patientId: "patient-a", channel: "WHATSAPP", purpose: "RECOVERY", explicit: true, source: "SIGNED_FORM", policyVersion: "1" };
const request = (method, path, payload, user = "owner-a") => app.inject({ method, url: `/api/recovery${path}`, headers: { cookie: `bhon_session=${user}`, origin: "https://app.bhon.test" }, ...(payload === undefined ? {} : { payload }) });
const draft = (text = genericText, id = "opportunity-a") => request("POST", `/${id}/drafts`, { text, reviewed: true });
const rows = async (table) => (await database.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
async function captureConsent() {
  const response = await request("POST", "/consents", consentBody);
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data;
}

test("list isolates tenants, sorts by priority then action time, and reports missing consent", async () => {
  await database.exec(`INSERT INTO recovery_opportunities (id, tenant_id, patient_id, source_type, source_id, priority_score, next_action_at) VALUES
    ('low-priority', 'a', 'patient-a', 'BUDGET', 'low', 10, now() - interval '1 day'),
    ('same-priority-earlier', 'a', 'patient-a', 'BUDGET', 'early', 90, now() - interval '1 day')`);
  const response = await request("GET", "/opportunities");
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json().data.map((item) => item.id), ["same-priority-earlier", "opportunity-a", "low-priority"]);
  assert.equal(response.json().data[1].consentStatus, "MISSING");
  assert.equal(response.json().data[1].outboundEligible, false);
  assert.ok(response.json().draftTemplates.some((entry) => entry.text === genericText));
  assert.doesNotMatch(response.body, /patient-b|opportunity-b|sequence-b/);
});

test("foreign and absent IDs return identical errors and never transition another clinic", async () => {
  for (const action of ["drafts", "handoff", "opt-out"]) {
    const body = action === "drafts" ? { text: genericText, reviewed: true } : {};
    const foreign = await request("POST", `/opportunity-b/${action}`, body);
    const missing = await request("POST", `/absent/${action}`, body);
    assert.equal(foreign.statusCode, 404, foreign.body);
    assert.deepEqual(foreign.json(), missing.json());
  }
  assert.equal((await rows("recovery_sequences"))[1].status, "ACTIVE");
  assert.equal((await rows("communication_events")).length, 0);
});

test("consent requires management, an in-tenant patient, and explicit WhatsApp authorization", async () => {
  assert.equal((await request("POST", "/consents", { ...consentBody, patientId: "patient-b" })).statusCode, 404);
  assert.equal((await request("POST", "/consents", consentBody, "reception-a")).statusCode, 403);
  for (const body of [{ ...consentBody, explicit: false }, { ...consentBody, channel: "SMS" }, { ...consentBody, source: "" }, { ...consentBody, policyVersion: "" }]) {
    assert.equal((await request("POST", "/consents", body)).statusCode, 400);
  }
  assert.equal((await rows("contact_consents")).length, 0);
  const consent = await captureConsent();
  assert.equal(consent.status, "ACTIVE");
  assert.equal(consent.patientId, "patient-a");
  assert.ok(consent.capturedAt);
});

test("draft refuses missing consent, unreviewed text, and protected clinical content without storing it", async () => {
  assert.equal((await draft()).statusCode, 409);
  await captureConsent();
  assert.equal((await request("POST", "/opportunity-a/drafts", { text: genericText, reviewed: false })).statusCode, 400);
  for (const text of ["Seu diagnóstico de diabetes", "Precisamos agendar implante dentário", "Use amoxicilina 500mg", "Seu exame deu positivo", "Tome o novo remédio", "Olá, conversa não aprovada."]) {
    const response = await draft(text);
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(response.json().code, "UNSAFE_COMMERCIAL_TEXT");
    assert.ok(!response.body.includes(text));
  }
  assert.equal((await rows("communication_events")).length, 0);
});

test("a reviewed eligible draft is internal and persists only redacted content", async () => {
  await captureConsent();
  const response = await draft();
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(response.json().data.text, genericText);
  const events = await rows("communication_events");
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "DRAFT_REVIEWED");
  assert.equal(events[0].direction, "INTERNAL");
  assert.equal(events[0].content_redacted, "[REVIEWED_COMMERCIAL_DRAFT]");
  assert.equal(events[0].provider_message_id, null);
  assert.ok(!JSON.stringify(events).includes(genericText));
  const sequence = (await rows("recovery_sequences"))[0];
  assert.equal(sequence.sent_at, null);
  assert.equal(sequence.step, 1);
  const queue = (await request("GET", "/opportunities")).json();
  assert.equal(queue.data[0].outboundEligible, true);
  assert.equal(queue.data[0].events[0].contentRedacted, "[REVIEWED_COMMERCIAL_DRAFT]");
});

test("handoff ends automation and simultaneous replays produce one event", async () => {
  await captureConsent();
  const responses = await Promise.all([1, 2, 3].map(() => request("POST", "/opportunity-a/handoff", {}, "reception-a")));
  responses.forEach((response) => assert.equal(response.statusCode, 200, response.body));
  assert.deepEqual(responses[0].json(), responses[1].json());
  const sequence = (await rows("recovery_sequences"))[0];
  assert.equal(sequence.status, "ENDED");
  assert.equal(sequence.scheduled_at, null);
  assert.ok(sequence.handoff_at);
  assert.ok(sequence.ended_at);
  assert.equal((await rows("communication_events")).filter((event) => event.kind === "HANDOFF").length, 1);
  assert.equal((await draft()).statusCode, 409);
  const opportunity = (await request("GET", "/opportunities")).json().data[0];
  assert.equal(opportunity.stage, "HUMAN_HANDOFF");
  assert.equal(opportunity.nextActionAt, null);
  assert.equal(opportunity.outboundEligible, false);
});

test("opt-out revokes WhatsApp consent, ends all patient sequences, and is replay-safe", async () => {
  await captureConsent();
  await database.exec(`INSERT INTO recovery_opportunities (id, tenant_id, patient_id, source_type, source_id) VALUES ('other-opportunity', 'a', 'patient-a', 'BUDGET', 'other');
    INSERT INTO recovery_sequences (id, tenant_id, patient_id, opportunity_id, status, scheduled_at) VALUES ('paused-sequence', 'a', 'patient-a', 'other-opportunity', 'PAUSED', now())`);
  const first = await request("POST", "/opportunity-a/opt-out", {});
  assert.equal(first.statusCode, 200, first.body);
  const again = await request("POST", "/opportunity-a/opt-out", {});
  assert.deepEqual(again.json(), first.json());
  assert.equal((await request("POST", "/opportunity-a/handoff", {})).statusCode, 200);
  const consents = await rows("contact_consents");
  assert.equal(consents[0].status, "REVOKED");
  assert.ok(consents[0].revoked_at);
  for (const sequence of (await rows("recovery_sequences")).filter((item) => item.tenant_id === "a")) {
    assert.equal(sequence.status, "ENDED");
    assert.equal(sequence.scheduled_at, null);
    assert.ok(sequence.ended_at);
  }
  assert.equal((await rows("communication_events")).length, 1);
  assert.equal((await rows("communication_events"))[0].kind, "OPT_OUT");
  assert.equal((await draft()).statusCode, 409);
  await database.exec(`INSERT INTO recovery_sequences (id, tenant_id, patient_id, opportunity_id) VALUES ('new-sequence', 'a', 'patient-a', 'other-opportunity')`);
  assert.equal((await draft(genericText, "other-opportunity")).statusCode, 409);
  const queue = (await request("GET", "/opportunities")).json().data;
  assert.ok(queue.every((item) => item.consentStatus === "REVOKED" && !item.outboundEligible));
});

test("a later opt-out revokes fresh consent captured after an earlier opt-out", async () => {
  await captureConsent();
  assert.equal((await request("POST", "/opportunity-a/opt-out", {})).statusCode, 200);

  await captureConsent();
  await database.exec(`INSERT INTO recovery_sequences (id, tenant_id, patient_id, opportunity_id, scheduled_at) VALUES
    ('fresh-sequence', 'a', 'patient-a', 'opportunity-a', now())`);

  const response = await request("POST", "/opportunity-a/opt-out", {});
  assert.equal(response.statusCode, 200, response.body);
  const consents = await rows("contact_consents");
  assert.ok(consents.every((consent) => consent.status === "REVOKED"));
  const sequences = await rows("recovery_sequences");
  assert.equal(sequences.find((sequence) => sequence.id === "fresh-sequence").status, "ENDED");
  assert.equal((await rows("communication_events")).filter((event) => event.kind === "OPT_OUT").length, 2);
});

test("unauthenticated and read-only users cannot make recovery changes", async () => {
  assert.equal((await app.inject({ method: "GET", url: "/api/recovery/opportunities" })).statusCode, 401);
  for (const action of ["drafts", "handoff", "opt-out"]) {
    assert.equal((await request("POST", `/opportunity-a/${action}`, action === "drafts" ? { text: genericText, reviewed: true } : {}, "viewer-a")).statusCode, 403);
  }
});
