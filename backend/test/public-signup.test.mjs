import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.DATABASE_URL ||= "postgresql://bhon:bhon@localhost:5432/bhon";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

const { buildApp } = await import("../src/app.ts");
const { prisma } = await import("../src/lib/prisma.ts");
const app = await buildApp({
  logger: false,
  cookieSecret: "test-only-cookie-secret-with-32-characters",
  allowedOrigins: ["https://app.bhon.test"],
});
await app.ready();

after(async () => { await app.close(); });

const validSignup = (overrides = {}) => ({
  clinicName: "Clínica Horizonte",
  ownerName: "Ana Silva",
  ownerEmail: "ana@horizonte.test",
  username: "ana.horizonte",
  password: "uma-senha-segura-123",
  phone: "11999999999",
  billingCycle: "MONTHLY",
  termsVersion: "2026-09-23",
  privacyVersion: "2026-09-23",
  acceptedTerms: true,
  acceptedPrivacy: true,
  ...overrides,
});

test("public trial rejects missing privacy consent through the signup contract", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/public/trials",
    payload: validSignup({ acceptedPrivacy: false }),
  });

  assert.equal(response.statusCode, 400, response.body);
  assert.equal(response.json().code, "INVALID_TRIAL_SIGNUP");
  assert.equal(response.json().error, "Aceite a Política de Privacidade para continuar.");
});

test("public trial rejects browser supplied price values", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/public/trials",
    payload: validSignup({ amount: 1, priceId: "price_attacker" }),
  });

  assert.equal(response.statusCode, 400, response.body);
  assert.equal(response.json().code, "VALIDATION_ERROR");
});

test("public trial does not expose an existing signup identifier", async () => {
  const originalFindFirst = prisma.trialSignup.findFirst;
  prisma.trialSignup.findFirst = async () => ({ id: "existing-signup-id" });
  try {
    const response = await app.inject({
      method: "POST",
      url: "/public/trials",
      payload: validSignup({ ownerEmail: "already-started@horizonte.test", username: "ana.existing" }),
    });

    assert.equal(response.statusCode, 202);
    assert.deepEqual(response.json(), { next: "EXISTING_SIGNUP" });
  } finally {
    prisma.trialSignup.findFirst = originalFindFirst;
  }
});
