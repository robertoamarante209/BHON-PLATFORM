import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";

const READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

export async function operationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get<{ Querystring: { search?: string } }>("/inventory", {
    preHandler: requireRole(READ_ROLES),
    schema: { querystring: { type: "object", additionalProperties: false, properties: { search: { type: "string", maxLength: 120 } } } },
  }, async (request, reply) => {
    const search = request.query.search?.trim();
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: request.tenantId!, isActive: true,
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ name: "asc" }],
      include: { movements: { take: 5, orderBy: { createdAt: "desc" } } },
    });
    return reply.send(items);
  });

  app.post<{ Body: { name: string; sku?: string; category?: string; unit?: string; currentStock?: number; minimumStock?: number; unitCost?: number } }>("/inventory", {
    preHandler: requireRole(WRITE_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["name"], properties: {
      name: { type: "string", minLength: 2, maxLength: 120 }, sku: { type: "string", maxLength: 80 },
      category: { type: "string", maxLength: 80 }, unit: { type: "string", minLength: 1, maxLength: 20 },
      currentStock: { type: "number", minimum: 0 }, minimumStock: { type: "number", minimum: 0 }, unitCost: { type: "number", minimum: 0 },
    } } },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const sku = request.body.sku?.trim() || null;
    if (sku && await prisma.inventoryItem.findFirst({ where: { tenantId, sku }, select: { id: true } })) {
      return reply.code(409).send({ error: "Já existe um item com este código.", code: "INVENTORY_SKU_CONFLICT" });
    }
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: {
        tenantId, name: request.body.name.trim(), sku, category: request.body.category?.trim() || null,
        unit: request.body.unit?.trim() || "un", currentStock: request.body.currentStock || 0,
        minimumStock: request.body.minimumStock || 0, unitCost: request.body.unitCost ?? null,
      } });
      await tx.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "INVENTORY_ITEM_CREATED", resource: "InventoryItem", resourceId: created.id } });
      return created;
    });
    return reply.code(201).send(item);
  });

  app.post<{ Params: { id: string }; Body: { type: "ENTRY" | "EXIT"; quantity: number; reason?: string } }>("/inventory/:id/movements", {
    preHandler: requireRole(WRITE_ROLES),
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
      body: { type: "object", additionalProperties: false, required: ["type", "quantity"], properties: {
        type: { type: "string", enum: ["ENTRY", "EXIT"] }, quantity: { type: "number", exclusiveMinimum: 0 }, reason: { type: "string", maxLength: 500 },
      } },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const current = await prisma.inventoryItem.findFirst({ where: { id: request.params.id, tenantId, isActive: true } });
    if (!current) return reply.code(404).send({ error: "Item de estoque não encontrado.", code: "INVENTORY_ITEM_NOT_FOUND" });
    const delta = request.body.type === "ENTRY" ? request.body.quantity : -request.body.quantity;
    if (Number(current.currentStock) + delta < 0) return reply.code(409).send({ error: "A saída excede o saldo disponível.", code: "INSUFFICIENT_STOCK" });

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id: current.id }, data: { currentStock: { increment: delta } } });
      await tx.inventoryMovement.create({ data: { tenantId, itemId: current.id, type: request.body.type, quantity: request.body.quantity, reason: request.body.reason?.trim() || null, actorUserId: request.user!.id } });
      await tx.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: `INVENTORY_${request.body.type}`, resource: "InventoryItem", resourceId: current.id, metadata: { quantity: request.body.quantity } } });
      return updated;
    });
    return reply.send(item);
  });

  app.get("/documents", { preHandler: requireRole(READ_ROLES) }, async (request, reply) => {
    const documents = await prisma.clinicDocument.findMany({
      where: { tenantId: request.tenantId! }, orderBy: { createdAt: "desc" },
      include: { patient: { select: { id: true, name: true, recordNumber: true } } },
    });
    return reply.send(documents);
  });

  app.post<{ Body: { title: string; category: string; fileName: string; url: string; mimeType?: string; patientId?: string } }>("/documents", {
    preHandler: requireRole(WRITE_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["title", "category", "fileName", "url"], properties: {
      title: { type: "string", minLength: 2, maxLength: 160 }, category: { type: "string", minLength: 2, maxLength: 80 },
      fileName: { type: "string", minLength: 1, maxLength: 255 }, url: { type: "string", minLength: 8, maxLength: 2000 },
      mimeType: { type: "string", maxLength: 120 }, patientId: { type: "string", maxLength: 100 },
    } } },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    let parsedUrl: URL;
    try { parsedUrl = new URL(request.body.url); } catch { return reply.code(400).send({ error: "Informe um endereço válido para o documento.", code: "INVALID_DOCUMENT_URL" }); }
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) return reply.code(400).send({ error: "O documento deve usar um endereço HTTP seguro.", code: "INVALID_DOCUMENT_URL" });
    if (request.body.patientId && !await prisma.patient.findFirst({ where: { id: request.body.patientId, tenantId, deletedAt: null }, select: { id: true } })) {
      return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });
    }
    const document = await prisma.clinicDocument.create({ data: {
      tenantId, patientId: request.body.patientId || null, title: request.body.title.trim(), category: request.body.category.trim(),
      fileName: request.body.fileName.trim(), url: parsedUrl.toString(), mimeType: request.body.mimeType?.trim() || null, createdById: request.user!.id,
    } });
    return reply.code(201).send(document);
  });

  app.get("/integrations", { preHandler: requireRole(READ_ROLES) }, async (request, reply) => {
    const configured = await prisma.integrationConnection.findMany({ where: { tenantId: request.tenantId! }, orderBy: { provider: "asc" } });
    const byProvider = new Map(configured.map((item) => [item.provider, item]));
    return reply.send(["WHATSAPP", "GOOGLE_CALENDAR", "NFE"].map((provider) => byProvider.get(provider) || { provider, status: "NOT_CONFIGURED", displayName: null, configuration: null }));
  });

  app.put<{ Params: { provider: string }; Body: { displayName?: string; accountLabel?: string; clinicPhone?: string } }>("/integrations/:provider", {
    preHandler: requireRole(WRITE_ROLES),
    schema: {
      params: { type: "object", required: ["provider"], properties: { provider: { type: "string", enum: ["WHATSAPP", "GOOGLE_CALENDAR", "NFE"] } } },
      body: { type: "object", additionalProperties: false, minProperties: 1, properties: {
        displayName: { type: "string", maxLength: 100 }, accountLabel: { type: "string", maxLength: 160 }, clinicPhone: { type: "string", maxLength: 30 },
      } },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const { displayName, ...configuration } = request.body;
    const connection = await prisma.integrationConnection.upsert({
      where: { tenantId_provider: { tenantId, provider: request.params.provider } },
      create: { tenantId, provider: request.params.provider, displayName: displayName?.trim() || null, status: "PENDING", configuration },
      update: { displayName: displayName?.trim() || null, status: "PENDING", configuration },
    });
    await prisma.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "INTEGRATION_CONFIGURED", resource: "IntegrationConnection", resourceId: connection.id, metadata: { provider: connection.provider } } });
    return reply.send(connection);
  });
}
