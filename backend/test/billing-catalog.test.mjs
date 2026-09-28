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

test("produção aceita somente credenciais Stripe live", () => {
  const environment = {
    NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_live_bhon", STRIPE_WEBHOOK_SECRET: "whsec_live",
    STRIPE_PRICE_BHON_CLINIC_MONTHLY: "price_monthly", STRIPE_PRICE_BHON_CLINIC_ANNUAL: "price_annual",
  };
  assert.equal(getStripeConfiguration(environment).livemode, true);
  assert.throws(() => getStripeConfiguration({ ...environment, STRIPE_SECRET_KEY: "sk_test_bhon" }), /sk_live/);
});
