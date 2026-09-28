import assert from "node:assert/strict";
import test from "node:test";

const { validateTrialSignup } = await import("../src/domain/trial-signup.ts");

const valid = {
  clinicName: "Clínica Horizonte",
  ownerName: "Ana Souza",
  ownerEmail: "ana@horizonte.test",
  username: "ana.horizonte",
  password: "SenhaDeTeste!2026",
  clinicPhone: "11999999999",
  ownerPhone: "11988888888",
  billingCycle: "MONTHLY",
  termsVersion: "2026-09-23",
  privacyVersion: "2026-09-23",
  acceptedTerms: true,
  acceptedPrivacy: true,
};

test("trial signup rejects an incomplete legal consent", () => {
  assert.deepEqual(validateTrialSignup({ ...valid, acceptedPrivacy: false }).errors, ["Aceite a Política de Privacidade para continuar."]);
});

test("trial signup normalizes identifiers and permits only the approved billing cycles", () => {
  const result = validateTrialSignup({ ...valid, ownerEmail: " ANA@HORIZONTE.TEST ", username: " Ana.Horizonte " });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.ownerEmailNormalized, "ana@horizonte.test");
  assert.equal(result.value.username, "ana.horizonte");
  assert.equal(validateTrialSignup({ ...valid, billingCycle: "WEEKLY" }).errors[0], "Escolha um ciclo mensal ou anual.");
});
