import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

export async function tenantRoutes(app: FastifyInstance) {
  // PLATFORM_OWNER only — exposes all tenant data
  app.get(
    "/tenants",
    { preHandler: [requireAuth, requireRole(["PLATFORM_OWNER"])] },
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
}
