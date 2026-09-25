import assert from "node:assert/strict";
import test, { after } from "node:test";
import Stripe from "stripe";

process.env.DATABASE_URL ||= "postgresql://bhon:bhon@localhost:5432/bhon";
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
process.env.STRIPE_SECRET_KEY ||= "sk_test_webhook_contract";
process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_webhook_contract";
process.env.STRIPE_PRICE_BHON_CLINIC_MONTHLY ||= "price_monthly_contract";
process.env.STRIPE_PRICE_BHON_CLINIC_ANNUAL ||= "price_annual_contract";

const { buildApp } = await import("../src/app.ts");
const { prisma } = await import("../src/lib/prisma.ts");
const { processStripeEvent } = await import("../src/domain/stripe-events.ts");
const app = buildApp({
  logger: false,
  cookieSecret: "test-only-cookie-secret-with-32-characters",
  allowedOrigins: ["https://app.bhon.test"],
});
await app.ready();

after(async () => { await app.close(); });

test("Stripe webhook rejects an unsigned browser payload before persistence", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/webhooks/stripe",
    headers: { "content-type": "application/json" },
    payload: "{}",
  });

  assert.equal(response.statusCode, 400, response.body);
  assert.equal(response.json().code, "STRIPE_SIGNATURE_INVALID");
});

test("Stripe webhook persists one verified event before acknowledging it", async () => {
  const payload = JSON.stringify({
    id: "evt_verified_contract",
    object: "event",
    type: "customer.subscription.trial_will_end",
    livemode: false,
    created: 1_790_263_475,
    data: { object: { id: "sub_contract", customer: "cus_contract", status: "trialing" } },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const originalCreate = prisma.stripeWebhookEvent.create;
  let persisted = 0;
  prisma.stripeWebhookEvent.create = async () => { persisted += 1; return { id: "inbox-1" }; };

  try {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      payload,
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(persisted, 1);
  } finally {
    prisma.stripeWebhookEvent.create = originalCreate;
  }
});

test("Stripe webhook provisions a trial signup exactly once from the durable inbox", async () => {
  const calls = { tenant: 0, user: 0, integration: 0, subscription: 0, onboarding: 0, outbox: 0, processed: 0 };
  const inbox = {
    id: "inbox-trial-start",
    stripeEventId: "evt_trial_start",
    eventType: "checkout.session.completed",
    processedAt: null,
    payload: { trialSignupId: "signup-trial-start", billingCycle: "MONTHLY", customerId: "cus_trial", subscriptionId: "sub_trial" },
  };
  const tx = {
    trialSignup: {
      findUnique: async () => ({
        id: "signup-trial-start", clinicName: "Clínica Horizonte", ownerName: "Ana Silva", ownerEmail: "ana@horizonte.test",
        username: "ana.horizonte", passwordHash: "hashed-password", phone: "11999999999", billingCycle: "MONTHLY", status: "CHECKOUT_STARTED",
      }),
      update: async () => ({ id: "signup-trial-start" }),
    },
    subscriptionPlan: { upsert: async () => ({ id: "plan-bhon-clinic" }) },
    tenant: { create: async () => { calls.tenant += 1; return { id: "tenant-trial" }; } },
    user: { create: async () => { calls.user += 1; return { id: "owner-trial" }; } },
    integrationConnection: { create: async () => { calls.integration += 1; return { id: "whatsapp-trial" }; } },
    subscription: { create: async () => { calls.subscription += 1; return { id: "subscription-trial" }; } },
    subscriptionTransition: { create: async () => ({ id: "transition-trial" }) },
    auditLog: { create: async () => ({ id: "audit-trial" }) },
    onboardingProgress: { create: async () => { calls.onboarding += 1; return { id: "onboarding-trial" }; } },
    notificationOutbox: { create: async () => { calls.outbox += 1; return { id: "outbox-trial" }; } },
    stripeWebhookEvent: { update: async () => { calls.processed += 1; return { id: "inbox-trial-start" }; } },
  };
  const store = {
    stripeWebhookEvent: {
      findUnique: async () => inbox,
      update: async () => ({ id: "inbox-trial-start" }),
    },
    $transaction: async (work) => work(tx),
  };

  await processStripeEvent("evt_trial_start", store);
  await processStripeEvent("evt_trial_start", { ...store, stripeWebhookEvent: { ...store.stripeWebhookEvent, findUnique: async () => ({ ...inbox, processedAt: new Date() }) } });

  assert.deepEqual(calls, { tenant: 1, user: 1, integration: 1, subscription: 1, onboarding: 1, outbox: 3, processed: 1 });
});

test("Stripe webhook records a cancellation without returning a clinic to active access", async () => {
  const calls = { subscription: 0, transition: 0, tenant: 0, processed: 0 };
  const store = {
    stripeWebhookEvent: {
      findUnique: async () => ({
        id: "inbox-cancel", stripeEventId: "evt_cancel", eventType: "customer.subscription.deleted", processedAt: null,
        payload: { subscriptionId: "sub_cancel", status: "canceled" },
      }),
    },
    $transaction: async (work) => work({
      subscription: {
        findUnique: async () => ({ id: "subscription-cancel", tenantId: "tenant-cancel", status: "ACTIVE" }),
        update: async () => { calls.subscription += 1; return { id: "subscription-cancel" }; },
      },
      subscriptionTransition: { create: async () => { calls.transition += 1; return { id: "transition-cancel" }; } },
      tenant: { update: async () => { calls.tenant += 1; return { id: "tenant-cancel" }; } },
      stripeWebhookEvent: { update: async () => { calls.processed += 1; return { id: "inbox-cancel" }; } },
    }),
  };

  await processStripeEvent("evt_cancel", store);
  assert.deepEqual(calls, { subscription: 1, transition: 1, tenant: 1, processed: 1 });
});

test("Stripe webhook puts a subscription into grace state after a failed invoice", async () => {
  const calls = { subscription: 0, transition: 0, tenant: 0, processed: 0 };
  const store = {
    stripeWebhookEvent: {
      findUnique: async () => ({ id: "inbox-failed-invoice", stripeEventId: "evt_failed_invoice", eventType: "invoice.payment_failed", processedAt: null, payload: { subscriptionId: "sub_failed" } }),
    },
    $transaction: async (work) => work({
      subscription: {
        findUnique: async () => ({ id: "subscription-failed", tenantId: "tenant-failed", status: "ACTIVE" }),
        update: async () => { calls.subscription += 1; return { id: "subscription-failed" }; },
      },
      subscriptionTransition: { create: async () => { calls.transition += 1; return { id: "transition-failed" }; } },
      tenant: { update: async () => { calls.tenant += 1; return { id: "tenant-failed" }; } },
      stripeWebhookEvent: { update: async () => { calls.processed += 1; return { id: "inbox-failed-invoice" }; } },
    }),
  };

  await processStripeEvent("evt_failed_invoice", store);
  assert.deepEqual(calls, { subscription: 1, transition: 1, tenant: 1, processed: 1 });
});
