import assert from "node:assert/strict";
import test from "node:test";

const { evaluateRecoveryEligibility } = await import("../src/domain/contact-preferences.ts");

test("recusa recuperação por WhatsApp quando o paciente recusou esse canal", () => {
  assert.deepEqual(evaluateRecoveryEligibility({ whatsapp: "REFUSED" }, "WHATSAPP"), {
    eligible: false,
    code: "CONTACT_CHANNEL_REFUSED",
  });
});

test("permite recuperação quando o canal está autorizado sem expor a origem", () => {
  assert.deepEqual(evaluateRecoveryEligibility({ whatsapp: "ALLOWED", source: "PATIENT_REQUEST" }, "WHATSAPP"), {
    eligible: true,
  });
});
