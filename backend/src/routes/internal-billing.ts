import type { FastifyInstance } from "fastify";
import { getStripeConfiguration } from "../domain/billing-catalog.js";
import { getStripeClient } from "../lib/stripe.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const PLATFORM_OWNER = ["PLATFORM_OWNER"] as const;

export async function internalBillingRoutes(app: FastifyInstance) {
  app.post("/platform/billing/test-checkout", { preHandler: [requireAuth, requireRole(PLATFORM_OWNER)] }, async (request, reply) => {
    const configuration = getStripeConfiguration();
    if (!configuration.testPaymentPriceId) {
      return reply.code(503).send({ error: "O checkout de teste ainda não está configurado.", code: "STRIPE_TEST_PRICE_UNAVAILABLE" });
    }
    const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: configuration.testPaymentPriceId, quantity: 1 }],
      metadata: { purpose: "internal_checkout_verification", initiatedByUserId: request.user!.id },
      success_url: `${appUrl}/platform/billing?checkout=test-success`,
      cancel_url: `${appUrl}/platform/billing?checkout=test-cancelled`,
    });
    if (!session.url) return reply.code(502).send({ error: "Não foi possível iniciar o checkout de teste.", code: "STRIPE_CHECKOUT_URL_MISSING" });
    return reply.send({ checkoutUrl: session.url });
  });
}
