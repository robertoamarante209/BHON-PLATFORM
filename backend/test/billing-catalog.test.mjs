import assert from "node:assert/strict";
import test from "node:test";

const { resolveBhonOffer, getStripeConfiguration } = await import("../src/domain/billing-catalog.ts");

test("billing catalog exposes only the approved BHON monthly offer", () => {
  assert.deepEqual(resolveBhonOffer("MONTHLY"), {
    code: "BHON_CLINIC",
    amountInCents: 29000,
    priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_MONTHLY",
    trialDays: 14,
  });
});

test("billing catalog exposes the annual offer and refuses another cycle", () => {
  assert.deepEqual(resolveBhonOffer("ANNUAL"), {
    code: "BHON_CLINIC",
    amountInCents: 290000,
    priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_ANNUAL",
    trialDays: 14,
  });
  assert.equal(resolveBhonOffer("WEEKLY"), null);
});

test("billing configuration fails closed without Stripe test credentials", () => {
  assert.throws(() => getStripeConfiguration({}), /STRIPE_SECRET_KEY/);
});
