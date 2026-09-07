import { prisma } from "./lib/prisma.js";
import { hashPassword } from "./lib/auth.js";

const main = async () => {
  const seedPassword = process.env.BHON_SEED_PASSWORD;
  const shouldResetOwnerPassword = process.env.BHON_RESET_OWNER_PASSWORD === "true";
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("Defina BHON_SEED_PASSWORD com pelo menos 12 caracteres antes de executar o seed.");
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: "odontoprime" },
    update: {},
    create: { name: "OdontoPrime", tradeName: "OdontoPrime", slug: "odontoprime", email: "contato@odontoprime.com.br" },
  });

  const emailNormalized = "roberto@odontoprime.com.br";
  const existingUser = await prisma.user.findUnique({
    where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized } },
    select: { id: true, passwordHash: true },
  });

  // Bootstrap é idempotente: deploys futuros nunca substituem uma senha já criada.
  if (!existingUser) {
    const hash = await hashPassword(seedPassword);
    await prisma.user.create({
      data: {
        tenantId: tenant.id, name: "Roberto Amarante", email: emailNormalized,
        emailNormalized, passwordHash: hash, role: "OWNER", status: "ACTIVE"
      },
    });
    console.log("Proprietário inicial criado.");
  } else if (!existingUser.passwordHash || shouldResetOwnerPassword) {
    const hash = await hashPassword(seedPassword);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash: hash, status: "ACTIVE" },
    });
    console.log(shouldResetOwnerPassword ? "Senha do proprietário redefinida." : "Senha inicial configurada.");
  } else {
    console.log("Proprietário existente preservado.");
  }

  console.log("Seed OK");
};
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
