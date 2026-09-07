import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.js";
import { tenantRoutes } from "./routes/tenants.js";
import { clinicalRoutes } from "./routes/clinical.js";
import { recoveryRoutes } from "./routes/recovery.js";
import { workflowRoutes } from "./routes/workflow.js";
import { prisma } from "./lib/prisma.js";
import { isTrustedCookieRequest } from "./domain/security.js";

const app = Fastify({
  logger: true,
});

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Política explícita para impedir execução e incorporação de conteúdo não autorizado.
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "https:", "data:", "blob:"],
      connectSrc: ["'self'", ...allowedOrigins],
    },
  },
});

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin não permitida pelo CORS"), false);
  },
  credentials: true,
});

const cookieSecret = process.env.COOKIE_SECRET;
if (!cookieSecret) throw new Error("COOKIE_SECRET não está definida.");

await app.register(cookie, { secret: cookieSecret, parseOptions: {} });

app.addHook("onRequest", async (request, reply) => {
  const trusted = isTrustedCookieRequest(
    request.method,
    request.cookies?.bhon_session,
    request.headers.origin,
    allowedOrigins,
  );
  if (!trusted) {
    return reply.code(403).send({
      error: "Origem da operação não autorizada.",
      code: "UNTRUSTED_ORIGIN",
    });
  }
});

// Registra rotas de domínio
await app.register(authRoutes);
await app.register(tenantRoutes);
await app.register(clinicalRoutes, { prefix: "/api" });
await app.register(recoveryRoutes, { prefix: "/api" });
await app.register(workflowRoutes, { prefix: "/api" });

app.get("/", async () => {
  return {
    status: "ok",
    product: "BHON Clinical Operating System",
    brand: "A clínica no controle.",
    timestamp: new Date().toISOString(),
  };
});

app.get("/health/live", async () => {
  return {
    status: "ok",
    service: "bhon-api",
    timestamp: new Date().toISOString(),
  };
});

const databaseReadiness = async (_request: unknown, reply: { code: (statusCode: number) => { send: (payload: object) => unknown } }) => {
  try {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    return {
      status: "ok",
      database: result[0]?.ok === 1 ? "connected" : "unknown",
    };
  } catch (error: any) {
    app.log.error(error, "Falha no health check do banco de dados");
    return reply.code(503).send({
      status: "degraded",
      database: "disconnected",
    });
  }
};

app.get("/health/ready", databaseReadiness);
app.get("/health/db", databaseReadiness);

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
