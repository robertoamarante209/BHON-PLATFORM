import type Stripe from "stripe";
import { prisma } from "../lib/prisma.js";
import { clinicSlug } from "./tenant-provisioning.js";

type StripeInboxPayload = {
  objectId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  trialSignupId: string | null;
  billingCycle: "MONTHLY" | "ANNUAL" | null;
  status: string | null;
};

function subscriptionState(stripeStatus: string | null) {
  switch (stripeStatus) {
    case "trialing": return { subscriptionStatus: "TRIAL", tenantStatus: "TEST" };
    case "active": return { subscriptionStatus: "ACTIVE", tenantStatus: "ACTIVE" };
    case "past_due":
    case "unpaid": return { subscriptionStatus: "PAST_DUE", tenantStatus: "ACTIVE" };
    case "paused": return { subscriptionStatus: "PAUSED", tenantStatus: "SUSPENDED" };
    case "canceled": return { subscriptionStatus: "CANCELLED", tenantStatus: "CANCELLED" };
    case "incomplete":
    case "incomplete_expired": return { subscriptionStatus: "EXPIRED", tenantStatus: "PAYMENT_PENDING" };
    default: return null;
  }
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

export function serializeStripeEvent(event: Stripe.Event): StripeInboxPayload {
  const object = event.data.object as unknown as Record<string, unknown>;
  const metadata = object.metadata && typeof object.metadata === "object" ? object.metadata as Record<string, unknown> : {};
  return {
    objectId: typeof object.id === "string" ? object.id : null,
    customerId: stripeId(object.customer),
    subscriptionId: stripeId(object.subscription) ?? (event.type.startsWith("customer.subscription.") && typeof object.id === "string" ? object.id : null),
    trialSignupId: typeof metadata.trialSignupId === "string" ? metadata.trialSignupId : null,
    billingCycle: metadata.billingCycle === "MONTHLY" || metadata.billingCycle === "ANNUAL" ? metadata.billingCycle : null,
    status: typeof object.status === "string" ? object.status : null,
  };
}

export async function processStripeEvent(eventId: string, database: any = prisma): Promise<void> {
  const inbox = await database.stripeWebhookEvent.findUnique({ where: { stripeEventId: eventId } });
  if (!inbox || inbox.processedAt) return;

  const payload = inbox.payload as StripeInboxPayload;
  const eventStatus = inbox.eventType === "invoice.paid" ? "active"
    : inbox.eventType === "invoice.payment_failed" ? "past_due"
      : payload.status;
  if (inbox.eventType.startsWith("customer.subscription.") || inbox.eventType === "invoice.paid" || inbox.eventType === "invoice.payment_failed") {
    const nextState = subscriptionState(eventStatus);
    if (!payload.subscriptionId || !nextState) throw new Error("Evento de assinatura sem estado reconhecido.");
    await database.$transaction(async (tx: any) => {
      const subscription = await tx.subscription.findUnique({ where: { stripeSubscriptionId: payload.subscriptionId } });
      if (!subscription) throw new Error("Assinatura Stripe não encontrada para transição.");
      if (subscription.status !== nextState.subscriptionStatus) {
        await tx.subscription.update({ where: { id: subscription.id }, data: { status: nextState.subscriptionStatus } });
        await tx.subscriptionTransition.create({ data: { subscriptionId: subscription.id, fromStatus: subscription.status, toStatus: nextState.subscriptionStatus, stripeEventId: inbox.stripeEventId } });
      }
      await tx.tenant.update({ where: { id: subscription.tenantId }, data: { status: nextState.tenantStatus } });
      await tx.stripeWebhookEvent.update({ where: { id: inbox.id }, data: { processedAt: new Date(), processingError: null } });
    });
    return;
  }

  if (inbox.eventType !== "checkout.session.completed") {
    await database.stripeWebhookEvent.update({ where: { id: inbox.id }, data: { processedAt: new Date(), processingError: null } });
    return;
  }

  if (!payload.trialSignupId || !payload.subscriptionId || !payload.customerId || !payload.billingCycle) {
    throw new Error("Evento de Checkout sem os identificadores mínimos de provisionamento.");
  }

  await database.$transaction(async (tx: any) => {
    const signup = await tx.trialSignup.findUnique({ where: { id: payload.trialSignupId } });
    if (!signup) throw new Error("Tentativa de cadastro não encontrada para o Checkout Stripe.");
    if (signup.status === "PROVISIONED") {
      await tx.stripeWebhookEvent.update({ where: { id: inbox.id }, data: { processedAt: new Date(), processingError: null } });
      return;
    }

    const plan = await tx.subscriptionPlan.upsert({
      where: { code: "BHON_CLINIC" },
      update: { isActive: true, monthlyPrice: 290, annualPrice: 2900 },
      create: { name: "BHON Clínica", code: "BHON_CLINIC", monthlyPrice: 290, annualPrice: 2900, maxProfessionals: 999, maxRooms: 999, isActive: true },
      select: { id: true },
    });
    const tenant = await tx.tenant.create({
      data: {
        name: signup.clinicName,
        tradeName: signup.clinicName,
        slug: `${clinicSlug(signup.clinicName) || "clinica"}-${signup.id.slice(0, 8)}`,
        email: signup.ownerEmail,
        phone: signup.phone,
        status: "TEST",
        planCode: "BHON_CLINIC",
      },
      select: { id: true },
    });
    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: signup.ownerName,
        email: signup.username,
        emailNormalized: signup.username.trim().toLowerCase(),
        passwordHash: signup.passwordHash,
        role: "OWNER",
        status: "ACTIVE",
        phone: signup.phone,
      },
      select: { id: true },
    });
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000);
    const subscription = await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "TRIAL",
        billingCycle: payload.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        renewalDate: trialEnd,
        amount: payload.billingCycle === "MONTHLY" ? 290 : 2900,
        stripeCustomerId: payload.customerId,
        stripeSubscriptionId: payload.subscriptionId,
        stripeLivemode: false,
      },
      select: { id: true },
    });
    await tx.subscriptionTransition.create({ data: { subscriptionId: subscription.id, fromStatus: null, toStatus: "TRIAL", stripeEventId: inbox.stripeEventId } });
    await tx.auditLog.create({ data: { tenantId: tenant.id, actorUserId: owner.id, action: "TRIAL_PROVISIONED", resource: "Tenant", resourceId: tenant.id, metadata: { subscriptionId: subscription.id } } });
    await tx.onboardingProgress.create({ data: { tenantId: tenant.id } });
    for (const day of [11, 13, 14]) {
      await tx.notificationOutbox.create({ data: { tenantId: tenant.id, channel: "INTERNAL", templateKey: `TRIAL_DAY_${day}`, scheduledFor: new Date(now.getTime() + day * 24 * 60 * 60 * 1_000) } });
    }
    await tx.trialSignup.update({ where: { id: signup.id }, data: { status: "PROVISIONED", tenantId: tenant.id } });
    await tx.stripeWebhookEvent.update({ where: { id: inbox.id }, data: { processedAt: new Date(), processingError: null } });
  });
}
