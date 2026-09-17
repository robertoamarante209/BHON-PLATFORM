import assert from "node:assert/strict";
import test from "node:test";

const { clinicSlug, validateTenantProvisioning } = await import("../src/domain/tenant-provisioning.ts");

test("gera slug estável, legível e sem acentos para uma nova clínica", () => {
  assert.equal(clinicSlug("Clínica São João & Filhos"), "clinica-sao-joao-filhos");
});

test("rejeita provisionamento sem responsável, login ou senha temporária segura", () => {
  assert.deepEqual(validateTenantProvisioning({
    name: "Clínica Aurora", email: "contato@aurora.test", ownerName: "", ownerLogin: "", temporaryPassword: "123",
  }), ["Informe o responsável da clínica.", "Informe o usuário de acesso inicial.", "A senha temporária deve ter ao menos 10 caracteres."]);
});

test("aceita dados mínimos para provisionar clínica e responsável", () => {
  assert.deepEqual(validateTenantProvisioning({
    name: "Clínica Aurora", email: "contato@aurora.test", ownerName: "Ana", ownerLogin: "ana.aurora", temporaryPassword: "SenhaSegura1!",
  }), []);
});
