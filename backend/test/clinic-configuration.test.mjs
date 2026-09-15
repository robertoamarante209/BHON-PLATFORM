import assert from "node:assert/strict";
import test from "node:test";

const { canManageClinicConfiguration, canReadAvailability, canReadProtocols, normalizeProtocolInput } = await import("../src/domain/clinic-configuration.ts");

test("gestor legado gerencia configuração sem ganhar administração geral da equipe", () => {
  assert.equal(canManageClinicConfiguration({ role: "MANAGER", permissions: null }), true);
  assert.equal(canManageClinicConfiguration({ role: "MANAGER", permissions: ["team.view"] }), false);
  assert.equal(canManageClinicConfiguration({ role: "MANAGER", permissions: ["team.manage"] }), true);
});

test("leitura clínica respeita permissões explícitas por recurso", () => {
  assert.equal(canReadAvailability({ role: "DENTIST", permissions: ["agenda.view"] }), true);
  assert.equal(canReadProtocols({ role: "DENTIST", permissions: ["patients.view"] }), true);
  assert.equal(canReadProtocols({ role: "DENTIST", permissions: ["agenda.view"] }), false);
});

test("normaliza protocolo preservando a ordem informada", () => {
  assert.deepEqual(normalizeProtocolInput({ title: "  Pós-operatório ", description: "  Orientações da clínica ", steps: ["  Passo A ", "Passo B"] }), {
    title: "Pós-operatório", description: "Orientações da clínica", steps: ["Passo A", "Passo B"], isActive: true,
  });
});

test("rejeita protocolo fora dos limites", () => {
  assert.throws(() => normalizeProtocolInput({ title: "x", steps: ["ok"] }), /protocolo/i);
  assert.throws(() => normalizeProtocolInput({ title: "Válido", steps: [] }), /protocolo/i);
  assert.throws(() => normalizeProtocolInput({ title: "Válido", steps: [""] }), /protocolo/i);
});
