import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/middleware.js";
import { hashPassword } from "../lib/auth.js";
import { clinicSlug, validateTenantProvisioning } from "../domain/tenant-provisioning.js";

const PLATFORM_OWNER = ["PLATFORM_OWNER"] as const;

async function uniqueTenantSlug(name: string) {
  const base = clinicSlug(name) || "clinica";
  let candidate = base;
  let suffix = 2;
  while (await prisma.tenant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

export async function tenantRoutes(app: FastifyInstance) {
  // PLATFORM_OWNER only — exposes all tenant data
  app.get(
    "/tenants",
    { preHandler: [requireAuth, requireRole(PLATFORM_OWNER)] },
    async () => {
      return await prisma.tenant.findMany({
        include: {
          _count: {
            select: { users: true, patients: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
  );

  app.post<{ Body: { name?: unknown; email?: unknown; phone?: unknown; planCode?: unknown; ownerName?: unknown; ownerLogin?: unknown; temporaryPassword?: unknown } }>(
    "/tenants",
    { preHandler: [requireAuth, requireRole(PLATFORM_OWNER)] },
    async (request, reply) => {
      const body = request.body || {};
      const errors = validateTenantProvisioning(body);
      if (errors.length) return reply.code(400).send({ error: errors[0], code: "INVALID_TENANT_PROVISIONING" });

      const ownerLogin = String(body.ownerLogin).trim().toLowerCase();
      const existingLogin = await prisma.user.findFirst({ where: { emailNormalized: ownerLogin, deletedAt: null }, select: { id: true } });
      if (existingLogin) return reply.code(409).send({ error: "Este usuário de acesso já está em uso.", code: "OWNER_LOGIN_ALREADY_EXISTS" });

      const tenant = await prisma.$transaction(async (tx) => {
        const slug = await uniqueTenantSlug(String(body.name).trim());
        const passwordHash = await hashPassword(String(body.temporaryPassword));
        const created = await tx.tenant.create({
          data: {
            name: String(body.name).trim(), tradeName: String(body.name).trim(), slug,
            email: String(body.email).trim().toLowerCase(), phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
            planCode: typeof body.planCode === "string" && body.planCode.trim() ? body.planCode.trim().toUpperCase() : "STARTER",
            status: "TEST",
          },
        });
        const owner = await tx.user.create({
          data: {
            tenantId: created.id, name: String(body.ownerName).trim(), email: ownerLogin, emailNormalized: ownerLogin,
            passwordHash, role: "OWNER", status: "ACTIVE",
          },
          select: { id: true, name: true, email: true, role: true },
        });
        await tx.auditLog.create({
          data: { tenantId: created.id, actorUserId: request.user!.id, action: "TENANT_PROVISIONED", resource: "Tenant", resourceId: created.id, metadata: { ownerUserId: owner.id, planCode: created.planCode } },
        });
        return { ...created, owner };
      });
      return reply.code(201).send(tenant);
    },
  );

  app.patch<{ Params: { id: string }; Body: { status?: unknown } }>(
    "/tenants/:id/status",
    { preHandler: [requireAuth, requireRole(PLATFORM_OWNER)] },
    async (request, reply) => {
      const status = request.body?.status;
      if (status !== "ACTIVE" && status !== "SUSPENDED") return reply.code(400).send({ error: "Status de clínica inválido.", code: "INVALID_TENANT_STATUS" });
      const target = await prisma.tenant.findFirst({ where: { id: request.params.id, deletedAt: null }, select: { id: true } });
      if (!target) return reply.code(404).send({ error: "Clínica não encontrada.", code: "TENANT_NOT_FOUND" });
      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.update({ where: { id: target.id }, data: { status } });
        if (status === "SUSPENDED") await tx.session.updateMany({ where: { tenantId: target.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.auditLog.create({ data: { tenantId: target.id, actorUserId: request.user!.id, action: status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_REACTIVATED", resource: "Tenant", resourceId: target.id } });
        return tenant;
      });
      return reply.send(result);
    },
  );
}
