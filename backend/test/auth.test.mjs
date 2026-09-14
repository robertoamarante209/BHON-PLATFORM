import assert from "node:assert/strict";
import { test } from "node:test";
import * as sessionModule from "../src/domain/session.ts";

const { revokeSession } = sessionModule;

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

test("sessão pública entrega status e permissões sem campos internos", () => {
  const user = {
    id: "user-1",
    tenantId: "tenant-1",
    name: "Ana",
    email: "ana",
    role: "RECEPTIONIST",
    status: "ACTIVE",
    permissions: ["agenda.view"],
    passwordHash: "segredo",
    emailNormalized: "ana",
    specialty: null,
    cro: null,
    phone: null,
    avatarUrl: null,
  };
  const tenant = {
    id: "tenant-1",
    name: "Clínica Exemplo",
    tradeName: null,
    slug: "clinica-exemplo",
    status: "ACTIVE",
    planCode: "PRO",
    createdAt: new Date("2026-09-14T12:00:00.000Z"),
  };

  const result = sessionModule.presentSessionUser?.(user, tenant, 2);

  assert.equal(result?.status, "ACTIVE");
  assert.deepEqual(result?.permissions, ["agenda.view"]);
  assert.equal(result?.tenant.activeRoomsCount, 2);
  assert.equal("passwordHash" in (result || {}), false);
  assert.equal("emailNormalized" in (result || {}), false);
});
