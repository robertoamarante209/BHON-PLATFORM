import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Runtime serverless usa o pooler transacional; migrations usam a conexão
    // direta/session pooler quando DIRECT_URL estiver configurada.
    // `prisma generate` não abre conexão. O fallback permite gerar o cliente em
    // previews sem credenciais; runtime e migrations continuam exigindo a URL real.
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5432/bhon",
  },
});
