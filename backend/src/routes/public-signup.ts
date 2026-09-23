import type { FastifyInstance } from "fastify";
import { hashPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { getStripeClient } from "../lib/stripe.js";
import { getStripeConfiguration, resolveBhonOffer } from "../domain/billing-catalog.js";
import { validateTrialSignup } from "../domain/trial-signup.js";
import { SlidingWindowRateLimiter } from "../domain/security.js";

const signupLimiter = new SlidingWindowRateLimiter(5, 15 * 60 * 1_000);
const CHECKOUT_EXPIRY_MS = 60 * 60 * 1_000;

export async function publicSignupRoutes(app: FastifyInstance) {
  app.post<{ Body: Record<string, unknown> }>("/public/trials", {
    schema: { body: { type: "object", additionalProperties: false } },
  }, async (request, reply) => {
    const parsed = validateTrialSignup(request.body || {});
    if (parsed.errors.length) return reply.code(400).send({ error: parsed.errors[0], code: "INVALID_TRIAL_SIGNUP" });
    const { value } = parsed;
    const limiter = signupLimiter.check(`${request.ip}:${value.ownerEmailNormalized}`);
    if (!limiter.allowed) return reply.header("Retry-After", String(limiter.retryAfterSeconds)).code(429).send({ error: "Aguarde alguns minutos antes de tentar novamente.", code: "TRIAL_RATE_LIMITED" });

    const pending = await prisma.trialSignup.findFirst({
      where: { ownerEmailNormalized: value.ownerEmailNormalized, status: { in: ["PENDING", "CHECKOUT_STARTED", "CHECKOUT_COMPLETED"] }, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (pending) return reply.code(202).send({ id: pending.id, next: "CHECKOUT" });

    const passwordHash = await hashPassword(value.password);
    const signup = await prisma.trialSignup.create({
      data: {
        clinicName: value.clinicName, ownerName: value.ownerName, ownerEmail: value.ownerEmail,
        ownerEmailNormalized: value.ownerEmailNormalized, username: value.username, passwordHash,
        phone: value.phone, billingCycle: value.billingCycle, expiresAt: new Date(Date.now() + CHECKOUT_EXPIRY_MS),
        legalConsents: { create: [
          { documentType: "TERMS", documentVersion: value.termsVersion },
          { documentType: "PRIVACY", documentVersion: value.privacyVersion },
        ] },
      }, select: { id: true },
    });
    return reply.code(201).send({ id: signup.id, next: "CHECKOUT" });
  });

  app.post<{ Params: { id: string } }>("/public/trials/:id/checkout", async (request, reply) => {
    const signup = await prisma.trialSignup.findFirst({ where: { id: request.params.id, expiresAt: { gt: new Date() }, status: { in: ["PENDING", "CHECKOUT_STARTED"] } } });
    if (!signup) return reply.code(404).send({ error: "Não foi possível retomar este cadastro.", code: "TRIAL_SIGNUP_NOT_AVAILABLE" });
    const offer = resolveBhonOffer(signup.billingCycle);
    if (!offer) return reply.code(400).send({ error: "Oferta indisponível.", code: "TRIAL_OFFER_NOT_AVAILABLE" });
    const configuration = getStripeConfiguration();
    const price = signup.billingCycle === "MONTHLY" ? configuration.monthlyPriceId : configuration.annualPriceId;
    const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: signup.ownerEmail,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { trial_period_days: offer.trialDays, metadata: { trialSignupId: signup.id, offerCode: offer.code } },
      metadata: { trialSignupId: signup.id, offerCode: offer.code, billingCycle: signup.billingCycle },
      success_url: `${appUrl}/teste-confirmado?signup=${encodeURIComponent(signup.id)}`,
      cancel_url: `${appUrl}/comece?checkout=cancelado`,
    }, { idempotencyKey: `bhon-trial-checkout-${signup.id}` });
    if (!session.url) return reply.code(502).send({ error: "Não foi possível iniciar o checkout.", code: "STRIPE_CHECKOUT_URL_MISSING" });
    await prisma.trialSignup.update({ where: { id: signup.id }, data: { status: "CHECKOUT_STARTED", stripeCheckoutSessionId: session.id } });
    return reply.send({ checkoutUrl: session.url });
  });
}
