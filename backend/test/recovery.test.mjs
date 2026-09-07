import assert from "node:assert/strict";
import test from "node:test";
import { appendNote, daysSince, financialExposure, sortRecoveryItems } from "../src/domain/recovery.ts";

const baseItem = {
  id: "base",
  source: "FOLLOW_UP",
  sourceId: "follow-up-1",
  priority: "MEDIUM",
  signal: "Sinal",
  reason: "Motivo",
  patient: { id: "patient-1", name: "Paciente", recordNumber: "BHON-1", phone: null },
  valueAtRisk: null,
  responsible: null,
  detectedAt: "2026-09-01T12:00:00.000Z",
  deadline: null,
  ageDays: 1,
  nextAction: "Contatar",
  state: "PENDENTE",
  availableActions: ["OPEN"],
  href: "/clinic/follow-ups",
};

test("ordena a fila por prioridade, prazo e idade sem alterar a entrada", () => {
  const items = [
    { ...baseItem, id: "medium", priority: "MEDIUM" },
    { ...baseItem, id: "urgent-later", priority: "URGENT", deadline: "2026-09-07T12:00:00.000Z" },
    { ...baseItem, id: "urgent-first", priority: "URGENT", deadline: "2026-09-06T12:00:00.000Z" },
  ];

  assert.deepEqual(sortRecoveryItems(items).map((item) => item.id), ["urgent-first", "urgent-later", "medium"]);
  assert.deepEqual(items.map((item) => item.id), ["medium", "urgent-later", "urgent-first"]);
});

test("calcula idade em dias sem produzir valores negativos", () => {
  const now = Date.parse("2026-09-06T12:00:00.000Z");
  assert.equal(daysSince(new Date("2026-09-03T12:00:00.000Z"), now), 3);
  assert.equal(daysSince(new Date("2026-09-07T12:00:00.000Z"), now), 0);
});

test("mantém histórico de notas com timestamp auditável", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  assert.equal(appendNote("Anterior", "  Novo contato  ", now), "Anterior\n[2026-09-06T12:00:00.000Z] Novo contato");
  assert.equal(appendNote("Anterior", "  ", now), "Anterior");
});

test("soma somente orçamento inativo e recebível vencido na exposição financeira", () => {
  assert.equal(financialExposure(12_500.5, 2_499.5), 15_000);
});

