import { prisma } from "./lib/prisma.js";
import { hashPassword } from "./lib/auth.js";

const main = async () => {
  const tenant = await prisma.tenant.upsert({ where: { slug: "odontoprime" }, update: {}, create: { name: "OdontoPrime", tradeName: "OdontoPrime", slug: "odontoprime", email: "contato@odontoprime.com.br" } });
  const hash = await hashPassword("BHON@2026");
  await prisma.user.upsert({ where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: "roberto@odontoprime.com.br" } }, update: {}, create: { tenantId: tenant.id, name: "Roberto Amarante", email: "roberto@odontoprime.com.br", emailNormalized: "roberto@odontoprime.com.br", passwordHash: hash, role: "OWNER", status: "ACTIVE" } });
  console.log("Seed OK");
};
main().catch(console.error).finally(() => prisma.$disconnect());
