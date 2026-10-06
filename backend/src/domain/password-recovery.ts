import { createHash, randomBytes } from "node:crypto";

const RESET_TTL_MS = 60 * 60 * 1_000;

type ResetTokenDatabase = {
  passwordResetToken: {
    updateMany(input: unknown): Promise<unknown>;
    create(input: unknown): Promise<unknown>;
    updateManyAndReturn(input: unknown): Promise<Array<{ userId: string }>>;
  };
};

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string, database: ResetTokenDatabase, now = new Date()) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
  await database.passwordResetToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  await database.passwordResetToken.create({ data: { userId, tokenDigest: digest(rawToken), expiresAt } });
  return { rawToken, expiresAt };
}

export async function consumePasswordResetToken(rawToken: string, database: ResetTokenDatabase, now = new Date()) {
  const rows = await database.passwordResetToken.updateManyAndReturn({
    where: { tokenDigest: digest(rawToken), usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return rows[0] || null;
}
