import assert from "node:assert/strict";
import test from "node:test";

const { createPasswordResetToken, consumePasswordResetToken } = await import("../src/domain/password-recovery.ts");

function createDatabase() {
  const rows = [];
  return {
    rows,
    passwordResetToken: {
      async updateMany({ where, data }) {
        let count = 0;
        for (const row of rows) {
          if (row.userId === where.userId && row.usedAt === null && row.expiresAt > where.expiresAt.gt) {
            row.usedAt = data.usedAt;
            count += 1;
          }
        }
        return { count };
      },
      async create({ data }) { const row = { id: `token-${rows.length + 1}`, usedAt: null, createdAt: new Date(), ...data }; rows.push(row); return row; },
      async updateManyAndReturn({ where, data }) {
        const row = rows.find((item) => item.tokenDigest === where.tokenDigest && item.usedAt === null && item.expiresAt > where.expiresAt.gt);
        if (!row) return [];
        row.usedAt = data.usedAt;
        return [row];
      },
    },
  };
}

test("password reset token is one-time, expires, and supersedes the previous token", async () => {
  const database = createDatabase();
  const now = new Date("2026-10-06T12:00:00.000Z");
  const first = await createPasswordResetToken("user-1", database, now);
  const second = await createPasswordResetToken("user-1", database, now);

  assert.equal(await consumePasswordResetToken(first.rawToken, database, now), null);
  assert.equal((await consumePasswordResetToken(second.rawToken, database, now))?.userId, "user-1");
  assert.equal(await consumePasswordResetToken(second.rawToken, database, now), null);

  const expired = await createPasswordResetToken("user-2", database, now);
  assert.equal(await consumePasswordResetToken(expired.rawToken, database, new Date(now.getTime() + 61 * 60_000)), null);
});
