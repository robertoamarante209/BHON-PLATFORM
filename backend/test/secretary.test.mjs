import assert from "node:assert/strict";
import test from "node:test";
import { buildSecretaryReply, classifySecretaryIntent } from "../src/domain/secretary.ts";

test("identifica intenções operacionais da secretária", () => {
  assert.equal(classifySecretaryIntent("Gostaria de remarcar meu horário"), "RESCHEDULE_APPOINTMENT");
  assert.equal(classifySecretaryIntent("Tem encaixe hoje?"), "SAME_DAY_FIT");
  assert.equal(classifySecretaryIntent("Confirmo minha consulta"), "CONFIRM_APPOINTMENT");
  assert.equal(classifySecretaryIntent("Preciso falar com uma pessoa"), "HUMAN_HANDOFF");
});

test("dúvida clínica não recebe orientação automatizada", () => {
  const reply = buildSecretaryReply({ clinicName: "BHON Clínica", patientName: "Ana Souza", message: "Estou com muita dor, qual remédio tomo?" });
  assert.equal(reply.intent, "CLINICAL_QUESTION");
  assert.equal(reply.status, "HUMAN_HANDOFF");
  assert.match(reply.message, /equipe responsável/i);
});

test("agendamento pede preferência antes de prometer horário", () => {
  const reply = buildSecretaryReply({ clinicName: "BHON Clínica", message: "Quero agendar uma consulta" });
  assert.equal(reply.intent, "BOOK_APPOINTMENT");
  assert.equal(reply.status, "WAITING_DETAILS");
  assert.equal(reply.requiresSchedulingDetails, true);
  assert.match(reply.message, /disponibilidade real/i);
});
