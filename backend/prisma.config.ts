import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Runtime serverless usa o pooler transacional; migrations usam a conexão
    // direta/session pooler quando DIRECT_URL estiver configurada.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
