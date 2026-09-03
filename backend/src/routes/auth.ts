import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, generateSessionToken, hashSessionToken } from "../lib/auth.js";
export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.code(400).send({ error: "Email e senha são obrigatórios." });
    }
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { emailNormalized: normalized, status: "ACTIVE", deletedAt: null },
    });

    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: "Credenciais inválidas." });
    }
    const token = generateSessionToken();

    await prisma.session.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null,
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId } };
  });
}
