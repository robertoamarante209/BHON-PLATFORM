import assert from "node:assert/strict";
import { test } from "node:test";
import { revokeSession } from "../src/domain/session.ts";

test("revogar a mesma sessão duas vezes permanece idempotente", async () => {
  const sessions = [{ id: "session-1", revokedAt: null }];
  const client = {
    session: {
      async updateMany({ where, data }) {
        const target = sessions.find((session) => session.id === where.id && session.revokedAt === where.revokedAt);
        if (!target) return { count: 0 };
        target.revokedAt = data.revokedAt;
        return { count: 1 };
      },
    },
  };
  const revokedAt = new Date("2026-09-09T02:00:00.000Z");

  const first = await revokeSession("session-1", client, revokedAt);
  const second = await revokeSession("session-1", client, revokedAt);

  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(sessions[0].revokedAt, revokedAt);
});
