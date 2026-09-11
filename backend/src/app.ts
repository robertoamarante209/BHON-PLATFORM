import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { isTrustedCookieRequest } from "./domain/security.js";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { clinicalRoutes } from "./routes/clinical.js";
import { financeRoutes } from "./routes/finance.js";
import { recoveryRoutes } from "./routes/recovery.js";
import { tenantRoutes } from "./routes/tenants.js";
import { teamRoutes } from "./routes/team.js";
import { settingsRoutes } from "./routes/settings.js";
import { workflowRoutes } from "./routes/workflow.js";
import { operationsRoutes } from "./routes/operations.js";

export type BuildAppOptions = {
  logger?: boolean;
  allowedOrigins?: string[];
  cookieSecret?: string;
};

function configuredOrigins() {
  if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGINS) {
    throw new Error("CORS_ORIGINS não está definida em produção.");
  }
  return (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true });
  const allowedOrigins = options.allowedOrigins ?? configuredOrigins();
  const cookieSecret = options.cookieSecret ?? process.env.COOKIE_SECRET;
  if (!cookieSecret) throw new Error("COOKIE_SECRET não está definida.");
  if (cookieSecret.length < 32) throw new Error("COOKIE_SECRET deve possuir pelo menos 32 caracteres.");

  app.setErrorHandler((error, request, reply) => {
    const apiError = error as { validation?: unknown; code?: string };
    if (apiError.validation) {
      request.log.warn({ err: error }, "Requisição rejeitada por validação");
      return reply.code(400).send({ error: "Requisição inválida.", code: "VALIDATION_ERROR" });
    }
    if (apiError.code === "ORIGIN_NOT_ALLOWED") {
      return reply.code(403).send({ error: "Origem não permitida.", code: "ORIGIN_NOT_ALLOWED" });
    }
    request.log.error({ err: error }, "Erro não tratado na API");
    return reply.code(500).send({ error: "Não foi possível concluir a operação.", code: "INTERNAL_ERROR" });
  });

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"],
        objectSrc: ["'none'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        fontSrc: ["'self'", "https:", "data:"], imgSrc: ["'self'", "https:", "data:", "blob:"],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
  });

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = Object.assign(new Error("Origin não permitida pelo CORS"), { code: "ORIGIN_NOT_ALLOWED", statusCode: 403 });
      return callback(error, false);
    },
    credentials: true,
  });
  app.register(cookie, { secret: cookieSecret, parseOptions: {} });

  app.addHook("onRequest", async (request, reply) => {
    if (!isTrustedCookieRequest(request.method, request.cookies?.bhon_session, request.headers.origin, allowedOrigins)) {
      return reply.code(403).send({ error: "Origem da operação não autorizada.", code: "UNTRUSTED_ORIGIN" });
    }
  });

  app.register(authRoutes);
  app.register(tenantRoutes);
  app.register(clinicalRoutes, { prefix: "/api" });
  app.register(recoveryRoutes, { prefix: "/api" });
  app.register(workflowRoutes, { prefix: "/api" });
  app.register(financeRoutes, { prefix: "/api" });
  app.register(teamRoutes, { prefix: "/api" });
  app.register(settingsRoutes, { prefix: "/api" });
  app.register(operationsRoutes, { prefix: "/api" });

  app.get("/", async () => ({
    status: "ok", product: "BHON Clinical Operating System", brand: "A clínica no controle.", timestamp: new Date().toISOString(),
  }));
  app.get("/health/live", async () => ({ status: "ok", service: "bhon-api", timestamp: new Date().toISOString() }));

  const databaseReadiness = async (_request: unknown, reply: { code: (statusCode: number) => { send: (payload: object) => unknown } }) => {
    try {
      const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
      return { status: "ok", database: result[0]?.ok === 1 ? "connected" : "unknown" };
    } catch (error) {
      app.log.error(error, "Falha no health check do banco de dados");
      return reply.code(503).send({ status: "degraded", database: "disconnected" });
    }
  };
  app.get("/health/ready", databaseReadiness);
  app.get("/health/db", databaseReadiness);

  return app;
}
