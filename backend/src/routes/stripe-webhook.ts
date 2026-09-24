import type { FastifyInstance } from "fastify";
import { getStripeClient } from "../lib/stripe.js";
import { getStripeConfiguration } from "../domain/billing-catalog.js";
import { prisma } from "../lib/prisma.js";
import { processStripeEvent, serializeStripeEvent } from "../domain/stripe-events.js";

export async function stripeWebhookRoutes(app: FastifyInstance) {
  app.post<{ Body: unknown }>("/webhooks/stripe", async (request, reply) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string" || !signature) {
      return reply.code(400).send({ error: "Assinatura Stripe inválida.", code: "STRIPE_SIGNATURE_INVALID" });
    }

    let event;
    try {
      const rawBody = (request as typeof request & { rawBody?: Buffer }).rawBody?.toString("utf8")
        ?? (typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {}));
      event = getStripeClient().webhooks.constructEvent(rawBody, signature, getStripeConfiguration().webhookSecret);
    } catch {
      return reply.code(400).send({ error: "Assinatura Stripe inválida.", code: "STRIPE_SIGNATURE_INVALID" });
    }

    try {
      await prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          livemode: event.livemode,
          payload: serializeStripeEvent(event),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return reply.code(200).send({ received: true, duplicate: true });
      throw error;
    }

    try {
      await processStripeEvent(event.id);
    } catch (error) {
      request.log.error({ err: error, stripeEventId: event.id }, "Falha ao processar evento Stripe persistido");
    }

    return reply.code(200).send({ received: true });
  });
}
