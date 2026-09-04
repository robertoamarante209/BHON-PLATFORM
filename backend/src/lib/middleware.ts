import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./prisma.js";
import { hashSessionToken } from "./auth.js";
import type { User, Tenant, Session } from "./prisma-types.js";

// Extensão de tipos para o FastifyRequest
declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    tenant?: Tenant;
    session?: Session;
    tenantId?: string;
  }
}

/**
 * Middleware para exigir autenticação obrigatória via Cookie ou Bearer Header.
 * Extrai a sessão diretamente do PostgreSQL, validando expiração e revogação.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  let token: string | undefined;

  // 1. Tenta recuperar do Cookie seguro HttpOnly
  if (request.cookies && request.cookies.bhon_session) {
    token = request.cookies.bhon_session;
  }

  // 2. Fallback para Header Authorization: Bearer <token>
  if (!token && request.headers.authorization) {
    const match = request.headers.authorization.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      token = match[1];
    }
  }

  if (!token) {
    reply.code(401).send({
      error: "Não autenticado. Sessão ausente ou inválida.",
      code: "UNAUTHORIZED"
    });
    return;
  }

  const tokenHash = hashSessionToken(token!);

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
        tenant: true
      }
    });

    if (!session) {
      reply.code(401).send({
        error: "Sessão inválida ou expirada.",
        code: "INVALID_SESSION"
      });
      return;
    }

    if (session.revokedAt) {
      reply.code(401).send({
        error: "Esta sessão foi revogada.",
        code: "SESSION_REVOKED"
      });
      return;
    }

    if (new Date() > session.expiresAt) {
      reply.code(401).send({
        error: "Sessão expirada. Faça login novamente.",
        code: "SESSION_EXPIRED"
      });
      return;
    }

    const { user, tenant } = session;

    if (!user || user.deletedAt !== null) {
      reply.code(401).send({
        error: "Usuário inativo ou excluído.",
        code: "USER_INACTIVE"
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      reply.code(403).send({
        error: "Usuário bloqueado no sistema.",
        code: "USER_BLOCKED"
      });
      return;
    }

    // Injeta os dados autoritativos no request
    request.user = user;
    request.tenant = tenant;
    request.session = session;
    request.tenantId = user.tenantId;

  } catch (error) {
    request.log.error(error, "Erro ao autenticar sessão");
    reply.code(500).send({
      error: "Falha interna ao verificar autenticação.",
      code: "AUTH_VERIFICATION_FAILED"
    });
  }
}

/**
 * Middleware para controle de acesso baseado em papéis (RBAC).
 * PLATFORM_OWNER tem acesso irrestrito por padrão.
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({ error: "Usuário não autenticado." });
      return;
    }

    // PLATFORM_OWNER tem autoridade global
    if (request.user.role === "PLATFORM_OWNER") {
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.code(403).send({
        error: "Acesso negado. Seu perfil não tem permissão para realizar esta operação.",
        code: "FORBIDDEN"
      });
    }
  };
}

/**
 * Middleware para garantir isolamento multi-tenant estrito.
 * O tenantId NUNCA é aceito do cliente sem validação; deriva da sessão autenticada.
 */
export async function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user || !request.tenantId) {
    reply.code(401).send({ error: "Contexto de clínica não identificado." });
    return;
  }

  // Se o usuário for PLATFORM_OWNER e passar um header 'x-tenant-id', permite operar naquela clínica
  if (request.user.role === "PLATFORM_OWNER") {
    const overrideTenantId = request.headers["x-tenant-id"] as string | undefined;
    if (overrideTenantId) {
      request.tenantId = overrideTenantId;
    }
  }
}
