import assert from "node:assert/strict";
import test from "node:test";

const { checkDurableRateLimit } = await import("../src/domain/durable-rate-limit.ts");

test("durable rate limit is shared across database adapters", async () => {
  const rows = new Map();
  const database = { securityRateLimit: {
    async upsert({ where, create, update }) {
      const key = `${where.scope_identifierDigest.scope}:${where.scope_identifierDigest.identifierDigest}`;
      const current = rows.get(key);
      if (!current) { const row = { ...create }; rows.set(key, row); return row; }
      if (typeof update.attempts === "object" && update.attempts.increment) {
        const { attempts, ...rest } = update;
        Object.assign(current, rest, { attempts: current.attempts + attempts.increment });
      } else Object.assign(current, update);
      return current;
    },
  } };
  const input = { scope: "login", identifier: "203.0.113.9:ana@bhon.test", maximumAttempts: 2, windowMs: 15 * 60_000 };
  const now = new Date("2026-10-06T12:00:00.000Z");
  assert.equal((await checkDurableRateLimit(input, database, now)).allowed, true);
  assert.equal((await checkDurableRateLimit(input, database, now)).allowed, true);
  const blocked = await checkDurableRateLimit(input, database, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 900);
});
