import { prisma } from "./lib/prisma.js";
import { hashPassword } from "./lib/auth.js";

const main = async () => {
  const seedPassword = process.env.BHON_SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("Defina BHON_SEED_PASSWORD com pelo menos 12 caracteres antes de executar o seed.");
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: "odontoprime" },
    update: {},
    create: { name: "OdontoPrime", tradeName: "OdontoPrime", slug: "odontoprime", email: "contato@odontoprime.com.br" },
  });

  const hash = await hashPassword(seedPassword);
  await prisma.user.upsert({
    where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: "roberto@odontoprime.com.br" } },
    update: { passwordHash: hash, status: "ACTIVE" },
    create: {
      tenantId: tenant.id, name: "Roberto Amarante", email: "roberto@odontoprime.com.br",
      emailNormalized: "roberto@odontoprime.com.br", passwordHash: hash, role: "OWNER", status: "ACTIVE"
    },
  });

  console.log("Seed OK");
};
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
