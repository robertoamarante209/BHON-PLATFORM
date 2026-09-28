import type { FastifyInstance } from "fastify";
import { createActivationService, isActivationEventType, isActivationStepKey, type ActivationStepKey } from "../domain/activation.js";
import { loadDemoClinic, removeDemoClinic } from "../domain/demo-clinic.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";
import { prisma } from "../lib/prisma.js";

const ONBOARDING_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

const stepTimestamp: Record<ActivationStepKey, "clinicProfileReadyAt" | "patientReadyAt" | "teamReadyAt" | "appointmentReadyAt" | "followUpReadyAt" | "firstValueAt"> = {
  PROFILE: "clinicProfileReadyAt",
  PATIENTS: "patientReadyAt",
  TEAM: "teamReadyAt",
  AGENDA: "appointmentReadyAt",
  OPPORTUNITY: "followUpReadyAt",
  SARAH_MESSAGE: "firstValueAt",
};

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);
  const activation = createActivationService(prisma);

  app.get("/onboarding", { preHandler: requireRole(ONBOARDING_ROLES) }, async (request) => {
    return activation.getSnapshot(request.tenantId!);
  });

  app.post<{ Body: { type: unknown } }>("/onboarding/events", {
    preHandler: requireRole(ONBOARDING_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: { type: { type: "string", maxLength: 64 } },
      },
    },
  }, async (request, reply) => {
    if (!isActivationEventType(request.body.type)) {
      return reply.code(400).send({ error: "Evento de ativação inválido.", code: "ACTIVATION_EVENT_INVALID" });
    }
    await activation.recordEvent({
      tenantId: request.tenantId!,
      actorUserId: request.user!.id,
      type: request.body.type,
    });
    return reply.code(201).send({ ok: true });
  });

  app.patch<{ Params: { step: string }; Body: { completed: boolean } }>("/onboarding/steps/:step", {
    preHandler: requireRole(ONBOARDING_ROLES),
    schema: {
      params: { type: "object", additionalProperties: false, required: ["step"], properties: { step: { type: "string", maxLength: 32 } } },
      body: { type: "object", additionalProperties: false, required: ["completed"], properties: { completed: { type: "boolean" } } },
    },
  }, async (request, reply) => {
    if (!isActivationStepKey(request.params.step)) {
      return reply.code(400).send({ error: "Etapa de ativação inválida.", code: "ACTIVATION_STEP_INVALID" });
    }
    const field = stepTimestamp[request.params.step];
    await prisma.onboardingProgress.upsert({
      where: { tenantId: request.tenantId! },
      create: { tenantId: request.tenantId!, [field]: request.body.completed ? new Date() : null },
      update: { [field]: request.body.completed ? new Date() : null },
    });
    return activation.getSnapshot(request.tenantId!);
  });

  app.patch<{ Body: { dismissed: boolean } }>("/onboarding", {
    preHandler: requireRole(ONBOARDING_ROLES),
    schema: {
      body: { type: "object", additionalProperties: false, required: ["dismissed"], properties: { dismissed: { type: "boolean" } } },
    },
  }, async (request) => {
    await prisma.onboardingProgress.upsert({
      where: { tenantId: request.tenantId! },
      create: { tenantId: request.tenantId!, dismissedAt: request.body.dismissed ? new Date() : null },
      update: { dismissedAt: request.body.dismissed ? new Date() : null },
    });
    return activation.getSnapshot(request.tenantId!);
  });

  app.post("/onboarding/demo", { preHandler: requireRole(ONBOARDING_ROLES) }, async (request, reply) => {
    try {
      const demo = await prisma.$transaction(async (transaction) => {
        const created = await loadDemoClinic(transaction, request.tenantId!, request.user!.id);
        await transaction.activationEvent.create({
          data: { tenantId: request.tenantId!, actorUserId: request.user!.id, type: "DEMO_LOADED" },
        });
        return created;
      });
      return reply.code(201).send({ demo, snapshot: await activation.getSnapshot(request.tenantId!) });
    } catch (error) {
      if (error instanceof Error && error.message === "DEMO_REQUIRES_EMPTY_CLINIC") {
        return reply.code(409).send({ error: "A demonstração só pode ser carregada em uma clínica sem dados.", code: error.message });
      }
      throw error;
    }
  });

  app.delete("/onboarding/demo", { preHandler: requireRole(ONBOARDING_ROLES) }, async (request, reply) => {
    try {
      const demo = await prisma.$transaction(async (transaction) => {
        const removed = await removeDemoClinic(transaction, request.tenantId!, request.user!.id);
        await transaction.activationEvent.create({
          data: { tenantId: request.tenantId!, actorUserId: request.user!.id, type: "DEMO_REMOVED" },
        });
        return removed;
      });
      return reply.send({ demo, snapshot: await activation.getSnapshot(request.tenantId!) });
    } catch (error) {
      if (error instanceof Error && error.message === "DEMO_NOT_FOUND") {
        return reply.code(404).send({ error: "Não há demonstração para remover.", code: error.message });
      }
      throw error;
    }
  });
}
