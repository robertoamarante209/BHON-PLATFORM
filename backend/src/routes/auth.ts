import type { FastifyInstance } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, generateSessionToken, hashSessionToken } from "../lib/auth.js";
import { requireAuth } from "../lib/middleware.js";
import { SlidingWindowRateLimiter } from "../domain/security.js";
import { revokeSession } from "../domain/session.js";
import { normalizeGoogleEmail, mapGoogleUserRowToSessionUser } from "../domain/google-identity.js";

const loginLimiter = new SlidingWindowRateLimiter(5, 15 * 60 * 1_000);
const googleClient = new OAuth2Client();

async function createAuthenticatedSession(reply: any, request: any, user: any, rememberMe = true) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const sessionTtlMs = rememberMe === false ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + sessionTtlMs);

  await prisma.session.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: request.ip,
      userAgent: (request.headers["user-agent"] as string) || null,
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "LOGIN",
        resource: "Session",
        userAgent: (request.headers["user-agent"] as string) || null,
        metadata: { ip: request.ip },
      },
    });
  } catch {
    // Auditoria não deve impedir o login.
  }

  reply.setCookie("bhon_session", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });

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
        id: user.tenant.id,
        name: user.tenant.name,
        tradeName: user.tenant.tradeName,
        slug: user.tenant.slug,
        status: user.tenant.status,
        planCode: user.tenant.planCode,
        createdAt: user.tenant.createdAt,
        activeRoomsCount: user.tenant.rooms.length,
      },
    },
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", minLength: 3, maxLength: 320 },
          password: { type: "string", minLength: 1, maxLength: 200 },
          rememberMe: { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, rememberMe } = (request.body || {}) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!email || !password) {
      return reply.code(400).send({ error: "E-mail e senha são obrigatórios.", code: "MISSING_CREDENTIALS" });
    }

    const normalized = email.trim().toLowerCase();
    const limiterKey = `${request.ip}:${normalized}`;
    const limit = loginLimiter.check(limiterKey);
    if (!limit.allowed) {
      return reply.header("Retry-After", String(limit.retryAfterSeconds)).code(429).send({
        error: "Muitas tentativas. Aguarde antes de tentar novamente.",
        code: "LOGIN_RATE_LIMITED",
      });
    }

    const user = await prisma.user.findFirst({
      where: { emailNormalized: normalized, deletedAt: null },
      include: { tenant: { include: { rooms: { where: { isActive: true }, select: { id: true } } } } },
    });

    if (!user || !user.passwordHash) {
      loginLimiter.recordFailure(limiterKey);
      return reply.code(401).send({ error: "Credenciais inválidas.", code: "INVALID_CREDENTIALS" });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      loginLimiter.recordFailure(limiterKey);
      return reply.code(401).send({ error: "Credenciais inválidas.", code: "INVALID_CREDENTIALS" });
    }

    if (user.status !== "ACTIVE") {
      loginLimiter.recordFailure(limiterKey);
      return reply.code(403).send({ error: "Este usuário está inativo ou bloqueado no sistema.", code: "USER_INACTIVE_OR_BLOCKED" });
    }

    loginLimiter.reset(limiterKey);
    return createAuthenticatedSession(reply, request, user, rememberMe);
  });

  app.post("/auth/google", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["credential"],
        properties: {
          credential: { type: "string", minLength: 100, maxLength: 10000 },
          rememberMe: { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const { credential, rememberMe } = (request.body || {}) as { credential?: string; rememberMe?: boolean };
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return reply.code(503).send({ error: "Login com Google ainda não está configurado.", code: "GOOGLE_NOT_CONFIGURED" });
    }

    if (!credential) {
      return reply.code(400).send({ error: "Credencial Google ausente.", code: "GOOGLE_CREDENTIAL_REQUIRED" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      return reply.code(401).send({ error: "Credencial Google inválida ou expirada.", code: "INVALID_GOOGLE_CREDENTIAL" });
    }

    const googleSubject = payload?.sub;
    const googleEmail = payload?.email ? normalizeGoogleEmail(payload.email) : null;
    const emailVerified = payload?.email_verified === true;

    if (!googleSubject || !googleEmail || !emailVerified) {
      return reply.code(401).send({ error: "A conta Google precisa ter um e-mail verificado.", code: "GOOGLE_EMAIL_NOT_VERIFIED" });
    }

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      tenant_id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      specialty: string | null;
      cro: string | null;
      phone: string | null;
      avatar_url: string | null;
      google_subject: string | null;
      google_email: string | null;
    }>>`
      SELECT id, tenant_id, name, email, role, status, specialty, cro, phone, avatar_url,
             google_subject, google_email
      FROM users
      WHERE deleted_at IS NULL
        AND (
          google_subject = ${googleSubject}
          OR LOWER(TRIM(COALESCE(google_email, ''))) = ${googleEmail}
          OR LOWER(TRIM(COALESCE(email, ''))) = ${googleEmail}
        )
      LIMIT 1
    `;

    const userRow = rows[0];
    if (!userRow) {
      return reply.code(403).send({
        error: "Esta conta Google ainda não está vinculada a um usuário BHON.",
        code: "GOOGLE_ACCOUNT_NOT_LINKED",
      });
    }

    if (userRow.status !== "ACTIVE") {
      return reply.code(403).send({ error: "Este usuário está inativo ou bloqueado no sistema.", code: "USER_INACTIVE_OR_BLOCKED" });
    }

    if (userRow.google_subject && userRow.google_subject !== googleSubject) {
      return reply.code(403).send({ error: "Esta conta Google não corresponde à identidade vinculada.", code: "GOOGLE_IDENTITY_MISMATCH" });
    }

    await prisma.$executeRaw`
      UPDATE users
      SET google_subject = ${googleSubject}, google_email = ${googleEmail}, updated_at = NOW()
      WHERE id = ${userRow.id}
        AND (google_subject IS NULL OR google_subject = ${googleSubject})
    `;

    const tenant = await prisma.tenant.findUnique({
      where: { id: userRow.tenant_id },
      include: { rooms: { where: { isActive: true }, select: { id: true } } },
    });

    if (!tenant) {
      return reply.code(403).send({ error: "Clínica do usuário não encontrada.", code: "TENANT_NOT_FOUND" });
    }

    return createAuthenticatedSession(reply, request, mapGoogleUserRowToSessionUser({
      ...userRow,
      google_email: googleEmail,
      google_subject: googleSubject,
    }, tenant), rememberMe);
  });

  app.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user!;
    const tenant = request.tenant!;
    const activeRoomsCount = await prisma.room.count({ where: { tenantId: tenant.id, isActive: true } });

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
          planCode: tenant.planCode,
          createdAt: tenant.createdAt,
          activeRoomsCount,
        },
      },
    });
  });

  app.post("/auth/logout", { preHandler: [requireAuth] }, async (request, reply) => {
    const session = request.session;
    const user = request.user;

    if (session) await revokeSession(session.id, prisma);

    if (user) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            actorUserId: user.id,
            action: "LOGOUT",
            resource: "Session",
            userAgent: (request.headers["user-agent"] as string) || null,
          },
        });
      } catch {
        // Falha não impeditiva de auditoria.
      }
    }

    reply.clearCookie("bhon_session", { path: "/" });
    return reply.send({ success: true, message: "Sessão encerrada com sucesso." });
  });
}
