import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function tenantRoutes(app: FastifyInstance) {
  app.get("/tenants", async () => {
    return await prisma.tenant.findMany();
  });
}
