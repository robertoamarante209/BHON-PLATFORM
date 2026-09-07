import { buildApp } from "./app.js";

const app = await buildApp();

try {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";
  await app.listen({ port, host });
  app.log.info(`BHON API rodando em http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

