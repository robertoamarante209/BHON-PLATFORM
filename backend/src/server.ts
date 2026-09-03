import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { prisma } from "./lib/prisma.js";
import { tenantRoutes } from "./routes/tenants.js";

const app = Fastify({
  logger: true,
});

app.register(tenantRoutes);
app.register(authRoutes);

app.get("/", async () => {
  return {
    status: "ok",
    message: "BHON API funcionando",
  };
});
app.get("/health/db", async () => {
  const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

  return {
    status: "ok",
    database: result[0]?.ok === 1 ? "connected" : "unknown",
  };
});

const start = async () => {
  try {
    await app.listen({
      port: 3000,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
