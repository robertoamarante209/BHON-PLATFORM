import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./prisma.js";
import { hashSessionToken } from "./auth.js";
import type { User, Tenant, Session } from "./prisma-types.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    tenant?: Tenant;
    session?: Session;
    tenantId?: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let token = request.cookies?.bhon_session;

  if (!token && request.headers.authorization) {
    const match = request.headers.authorization.match(/^Bearer\s+(.+)$/i);
    token = match?.[1];
  }

  if (!token) {
    reply.code(401).send({ error: "Não autenticado. Sessão ausente ou inválida.", code: "UNAUTHORIZED" });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true, tenant: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      reply.code(401).send({ error: "Sessão inválida ou expirada.", code: "INVALID_SESSION" });
      return;
    }

    if (session.user.deletedAt || session.user.status !== "ACTIVE") {
      reply.code(403).send({ error: "Usuário bloqueado no sistema.", code: "USER_BLOCKED" });
      return;
    }

    if (session.user.role !== "PLATFORM_OWNER" && ["CANCELLED", "SUSPENDED"].includes(session.tenant.status)) {
      reply.code(403).send({ error: "A clínica está indisponível para operação.", code: "TENANT_UNAVAILABLE" });
      return;
    }

    request.user = session.user;
    request.tenant = session.tenant;
    request.session = session;
    request.tenantId = session.user.tenantId;
  } catch (error) {
    request.log.error(error, "Erro ao autenticar sessão");
    reply.code(500).send({ error: "Falha interna ao verificar autenticação.", code: "AUTH_VERIFICATION_FAILED" });
  }
}

export function requireRole(allowedRoles: readonly string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({ error: "Usuário não autenticado.", code: "UNAUTHORIZED" });
      return;
    }
    if (!allowedRoles.includes(request.user.role)) {
      reply.code(403).send({
        error: "Acesso negado. Seu perfil não tem permissão para realizar esta operação.",
        code: "FORBIDDEN",
      });
    }
  };
}

export async function requireTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user || !request.tenantId) {
    reply.code(401).send({ error: "Contexto de clínica não identificado.", code: "TENANT_REQUIRED" });
    return;
  }

  const requestedTenantId = request.headers["x-tenant-id"] as string | undefined;
  if (!requestedTenantId || requestedTenantId === request.user.tenantId) return;

  if (request.user.role !== "PLATFORM_OWNER") {
    reply.code(403).send({
      error: "O contexto de clínica da sessão não pode ser alterado por este usuário.",
      code: "TENANT_CONTEXT_FORBIDDEN",
    });
    return;
  }

  const targetTenant = await prisma.tenant.findFirst({
    where: { id: requestedTenantId, deletedAt: null },
  });

  if (!targetTenant) {
    reply.code(404).send({ error: "Clínica não encontrada.", code: "TENANT_NOT_FOUND" });
    return;
  }

  if (["CANCELLED", "SUSPENDED"].includes(targetTenant.status)) {
    reply.code(403).send({ error: "A clínica está indisponível para operação.", code: "TENANT_UNAVAILABLE" });
    return;
  }

  request.tenantId = targetTenant.id;
  request.tenant = targetTenant;

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: targetTenant.id,
        actorUserId: request.user.id,
        action: "TENANT_CONTEXT_SWITCH",
        resource: "Tenant",
        resourceId: targetTenant.id,
        metadata: { fromTenantId: request.user.tenantId, toTenantId: targetTenant.id },
      },
    });
  } catch (error) {
    request.log.error(error, "Falha ao registrar troca de contexto de tenant");
    reply.code(500).send({ error: "Falha ao registrar o contexto operacional.", code: "TENANT_CONTEXT_AUDIT_FAILED" });
    return;
  }
}
