import { buildApp } from "./app.js";

const app = buildApp();

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";

  app.listen({ port, host })
    .then(() => app.log.info(`BHON API rodando em http://${host}:${port}`))
    .catch((error) => {
      app.log.error(error);
      process.exit(1);
    });
}

export default app;
