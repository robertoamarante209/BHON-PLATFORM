import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, generateSessionToken, hashSessionToken } from "../lib/auth.js";
import { requireAuth } from "../lib/middleware.js";

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/login
   * Realiza login autêntico com e-mail e senha.
   * Cria registro de sessão e injeta Cookie HttpOnly seguro.
   */
  app.post("/auth/login", async (request, reply) => {
    const { email, password } = (request.body || {}) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return reply.code(400).send({
        error: "E-mail e senha são obrigatórios.",
        code: "MISSING_CREDENTIALS"
      });
    }

    const normalized = email.trim().toLowerCase();

    // Busca o usuário ativo no PostgreSQL
    const user = await prisma.user.findFirst({
      where: {
        emailNormalized: normalized,
        deletedAt: null
      },
      include: {
        tenant: true
      }
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({
        error: "Credenciais inválidas.",
        code: "INVALID_CREDENTIALS"
      });
    }

    if (user.status !== "ACTIVE") {
      return reply.code(403).send({
        error: "Este usuário está inativo ou bloqueado no sistema.",
        code: "USER_INACTIVE_OR_BLOCKED"
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({
        error: "Credenciais inválidas.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Gera token de sessão criptográfico (32 bytes em hex)
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Cria registro de sessão seguro no banco de dados
    await prisma.session.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: request.ip,
        userAgent: (request.headers["user-agent"] as string) || null
      }
    });

    // Atualiza último login do operador
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Registra trilha de auditoria do login
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGIN",
          resource: "Session",
          userAgent: (request.headers["user-agent"] as string) || null,
          metadata: { ip: request.ip }
        }
      });
    } catch {
      // Falha não impeditiva de auditoria
    }

    // Define Cookie HttpOnly seguro
    reply.setCookie("bhon_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt
    });

    // Retorna dados essenciais do usuário e clínica
    return reply.send({
      token, // Fornecido também para clientes que usam Header Bearer
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        specialty: user.specialty,
        cro: user.cro,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          tradeName: user.tenant.tradeName,
          slug: user.tenant.slug,
          status: user.tenant.status,
          planCode: user.tenant.planCode
        }
      }
    });
  });

  /**
   * GET /auth/me
   * Retorna os dados do usuário e clínica autenticados a partir da sessão ativa.
   */
  app.get(
    "/auth/me",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user!;
      const tenant = request.tenant!;

      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          specialty: user.specialty,
          cro: user.cro,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            tradeName: tenant.tradeName,
            slug: tenant.slug,
            status: tenant.status,
            planCode: tenant.planCode
          }
        }
      });
    }
  );

  /**
   * POST /auth/logout
   * Revoga a sessão ativa no banco de dados e limpa o cookie seguro.
   */
  app.post(
    "/auth/logout",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const session = request.session;
      const user = request.user;

      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() }
        });
      }

      if (user) {
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              actorUserId: user.id,
              action: "LOGOUT",
              resource: "Session",
              userAgent: (request.headers["user-agent"] as string) || null
            }
          });
        } catch {
          // Falha não impeditiva de auditoria
        }
      }

      reply.clearCookie("bhon_session", {
        path: "/"
      });

      return reply.send({ success: true, message: "Sessão encerrada com sucesso." });
    }
  );
}
