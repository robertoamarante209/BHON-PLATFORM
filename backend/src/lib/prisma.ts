import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "./database-url.js";
import { PrismaClient } from "./prisma-types.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida.");
}

const adapter = new PrismaPg({ connectionString: normalizeDatabaseUrl(connectionString) });

export const prisma = new PrismaClient({ adapter });
