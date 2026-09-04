import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.js";
import { tenantRoutes } from "./routes/tenants.js";
import { clinicalRoutes } from "./routes/clinical.js";
import { prisma } from "./lib/prisma.js";

const app = Fastify({
  logger: true,
});

// Registra plugins essenciais de segurança e transporte
await app.register(helmet, {
  contentSecurityPolicy: false, // Permite funcionamento sem conflito com SPA
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || "bhon-clinical-os-session-secret-2026",
  parseOptions: {},
});

// Registra rotas de domínio
await app.register(authRoutes);
await app.register(tenantRoutes);
await app.register(clinicalRoutes, { prefix: "/api" });

app.get("/", async () => {
  return {
    status: "ok",
    product: "BHON Clinical Operating System",
    brand: "A clínica no controle.",
    timestamp: new Date().toISOString(),
  };
});

app.get("/health/db", async () => {
  try {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    return {
      status: "ok",
      database: result[0]?.ok === 1 ? "connected" : "unknown",
    };
  } catch (error: any) {
    return {
      status: "degraded",
      database: "disconnected",
      message: error?.message || "Erro ao conectar ao banco de dados",
    };
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "0.0.0.0";
    await app.listen({ port, host });
    app.log.info(`BHON API rodando em http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
