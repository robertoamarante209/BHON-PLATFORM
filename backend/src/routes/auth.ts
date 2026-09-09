import type { FastifyInstance } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, generateSessionToken, hashSessionToken } from "../lib/auth.js";
import { requireAuth } from "../lib/middleware.js";
import { SlidingWindowRateLimiter } from "../domain/security.js";
import { revokeSession } from "../domain/session.js";

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