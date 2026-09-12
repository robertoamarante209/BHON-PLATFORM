import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { OAuth2Client } from 'google-auth-library';
import { hashPassword } from '../src/lib/auth.ts';

process.env.DATABASE_URL ||= 'postgresql://bhon:bhon@localhost:5432/bhon';
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

const { prisma } = await import('../src/lib/prisma.ts');
const { buildApp } = await import('../src/app.ts');
const app = buildApp({
  logger: false,
  cookieSecret: 'test-only-cookie-secret-with-32-characters',
  allowedOrigins: ['https://app.bhon.test'],
});
await app.ready();

after(async () => { await app.close(); });

const activeTenant = {
  id: 'tenant-a', name: 'Clínica A', tradeName: null, slug: 'clinica-a', email: 'a@bhon.test', phone: null,
  status: 'ACTIVE', planCode: 'STARTER', patientRecordSequence: 0, deletedAt: null,
  createdAt: new Date('2026-09-01T00:00:00Z'), updatedAt: new Date('2026-09-01T00:00:00Z'), rooms: [],
};

async function withPrismaStubs(stubs, run) {
  const originals = [];
  for (const [delegateName, methods] of Object.entries(stubs)) {
    const delegate = prisma[delegateName];
    if (typeof methods === 'function') {
      originals.push([prisma, delegateName, delegate]);
      prisma[delegateName] = methods;
      continue;
    }
    for (const [methodName, implementation] of Object.entries(methods)) {
      originals.push([delegate, methodName, delegate[methodName]]);
      delegate[methodName] = implementation;
    }
  }
  try {
    return await run();
  } finally {
    for (const [delegate, methodName, implementation] of originals) delegate[methodName] = implementation;
  }
}

async function withGoogleIdentity(payload, run) {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => payload });
  try {
    return await run();
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
}

const googleCredential = 'g'.repeat(100);
const googlePayload = { sub: 'google-subject-a', email: 'google@bhon.test', email_verified: true };
const googleUser = {
  id: 'google-user-a', tenant_id: 'tenant-a', name: 'Pessoa Google', email: 'google@bhon.test',
  role: 'DENTIST', status: 'ACTIVE', specialty: null, cro: null, phone: null, avatar_url: null,
  google_subject: 'google-subject-a', google_email: 'google@bhon.test',
};

test('login Google rejeita tenant inativo sem criar sessão', async () => {
  let sessionsCreated = 0;

  await withGoogleIdentity(googlePayload, async () => {
    await withPrismaStubs({
      $queryRaw: async () => [googleUser],
      tenant: { findUnique: async () => ({ ...activeTenant, status: 'SUSPENDED' }) },
      session: { create: async () => { sessionsCreated += 1; } },
    }, async () => {
      const response = await app.inject({
        method: 'POST', url: '/auth/google', headers: { origin: 'https://app.bhon.test' },
        payload: { credential: googleCredential },
      });

      assert.equal(response.statusCode, 403);
      assert.equal(response.json().code, 'TENANT_UNAVAILABLE');
      assert.equal(sessionsCreated, 0);
    });
  });
});

test('login Google rejeita tenant excluído sem criar sessão', async () => {
  let sessionsCreated = 0;

  await withGoogleIdentity(googlePayload, async () => {
    await withPrismaStubs({
      $queryRaw: async () => [googleUser],
      tenant: { findUnique: async () => ({ ...activeTenant, deletedAt: new Date('2026-09-10T00:00:00Z') }) },
      session: { create: async () => { sessionsCreated += 1; } },
    }, async () => {
      const response = await app.inject({
        method: 'POST', url: '/auth/google', headers: { origin: 'https://app.bhon.test' },
        payload: { credential: googleCredential },
      });

      assert.equal(response.statusCode, 403);
      assert.equal(response.json().code, 'TENANT_UNAVAILABLE');
      assert.equal(sessionsCreated, 0);
    });
  });
});

test('login Google rejeita e-mail ambíguo sem vincular ou criar sessão', async () => {
  let queryCount = 0;
  let sessionsCreated = 0;
  let linksAttempted = 0;
  const secondUser = { ...googleUser, id: 'google-user-b', tenant_id: 'tenant-b', google_subject: null };

  await withGoogleIdentity(googlePayload, async () => {
    await withPrismaStubs({
      $queryRaw: async () => queryCount++ === 0 ? [] : [{ ...googleUser, google_subject: null }, secondUser],
      $executeRaw: async () => { linksAttempted += 1; return 1; },
      session: { create: async () => { sessionsCreated += 1; } },
    }, async () => {
      const response = await app.inject({
        method: 'POST', url: '/auth/google', headers: { origin: 'https://app.bhon.test' },
        payload: { credential: googleCredential },
      });

      assert.equal(response.statusCode, 403);
      assert.equal(response.json().code, 'GOOGLE_ACCOUNT_NOT_LINKED');
      assert.equal(linksAttempted, 0);
      assert.equal(sessionsCreated, 0);
    });
  });
});

test('login Google rejects a failed tenant-scoped identity link before creating a session', async () => {
  let queryCount = 0;
  let sessionsCreated = 0;
  let userUpdated = 0;
  let linkParameters;

  await withGoogleIdentity(googlePayload, async () => {
    await withPrismaStubs({
      $queryRaw: async () => queryCount++ === 0 ? [] : [{ ...googleUser, google_subject: null }],
      $executeRaw: async (strings, ...parameters) => {
        linkParameters = parameters;
        return 0;
      },
      tenant: { findUnique: async () => activeTenant },
      session: { create: async () => { sessionsCreated += 1; } },
      user: { update: async () => { userUpdated += 1; } },
    }, async () => {
      const response = await app.inject({
        method: 'POST', url: '/auth/google', headers: { origin: 'https://app.bhon.test' },
        payload: { credential: googleCredential },
      });

      assert.equal(response.statusCode, 409);
      assert.equal(response.json().code, 'GOOGLE_LINK_CONFLICT');
      assert.equal(linkParameters.includes('tenant-a'), true);
      assert.equal(sessionsCreated, 0);
      assert.equal(userUpdated, 0);
    });
  });
});

test('login por senha rejeita identidade ambígua com resposta genérica', async () => {
  const passwordHash = await hashPassword('senha-segura-123');
  const users = ['tenant-a', 'tenant-b'].map((tenantId, index) => ({
    id: `user-${index}`, tenantId, name: 'Pessoa', email: 'pessoa@bhon.test', emailNormalized: 'pessoa@bhon.test',
    passwordHash, role: 'DENTIST', status: 'ACTIVE', deletedAt: null, tenant: { ...activeTenant, id: tenantId },
  }));
  let sessionsCreated = 0;

  await withPrismaStubs({
    user: {
      findFirst: async () => users[0],
      findMany: async () => users,
      update: async () => users[0],
    },
    session: { create: async () => { sessionsCreated += 1; } },
    auditLog: { create: async () => ({}) },
  }, async () => {
    const response = await app.inject({
      method: 'POST', url: '/auth/login', headers: { origin: 'https://app.bhon.test' },
      payload: { email: 'pessoa@bhon.test', password: 'senha-segura-123' },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, 'INVALID_CREDENTIALS');
    assert.equal(JSON.stringify(response.json()).includes('tenant-'), false);
    assert.equal(sessionsCreated, 0);
  });
});

test('login por senha não cria sessão para tenant suspenso', async () => {
  const passwordHash = await hashPassword('senha-segura-456');
  const user = {
    id: 'user-suspended', tenantId: 'tenant-suspended', name: 'Pessoa', email: 'suspensa@bhon.test',
    emailNormalized: 'suspensa@bhon.test', passwordHash, role: 'OWNER', status: 'ACTIVE', deletedAt: null,
    tenant: { ...activeTenant, id: 'tenant-suspended', status: 'SUSPENDED' },
  };
  let sessionsCreated = 0;

  await withPrismaStubs({
    user: { findFirst: async () => user, findMany: async () => [user], update: async () => user },
    session: { create: async () => { sessionsCreated += 1; } },
    auditLog: { create: async () => ({}) },
  }, async () => {
    const response = await app.inject({
      method: 'POST', url: '/auth/login', headers: { origin: 'https://app.bhon.test' },
      payload: { email: 'suspensa@bhon.test', password: 'senha-segura-456' },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'TENANT_UNAVAILABLE');
    assert.equal(sessionsCreated, 0);
  });
});

test('/auth/me rejeita sessão cujo tenant foi excluído', async () => {
  const session = {
    id: 'session-a', tenantId: 'tenant-a', userId: 'user-a', expiresAt: new Date('2099-01-01T00:00:00Z'),
    revokedAt: null, ipAddress: null, userAgent: null, createdAt: new Date('2026-09-01T00:00:00Z'),
    user: { id: 'user-a', tenantId: 'tenant-a', name: 'Pessoa', email: 'pessoa@bhon.test', role: 'OWNER', status: 'ACTIVE', deletedAt: null },
    tenant: { ...activeTenant, deletedAt: new Date('2026-09-10T00:00:00Z') },
  };

  await withPrismaStubs({
    session: { findUnique: async () => session },
    room: { count: async () => 0 },
  }, async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: 'bhon_session=test-token' } });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'TENANT_UNAVAILABLE');
  });
});

test('mutação de etapa não encontra ID pertencente a outro tenant', async () => {
  const session = {
    id: 'session-a', tenantId: 'tenant-a', userId: 'user-a', expiresAt: new Date('2099-01-01T00:00:00Z'),
    revokedAt: null, ipAddress: null, userAgent: null, createdAt: new Date('2026-09-01T00:00:00Z'),
    user: { id: 'user-a', tenantId: 'tenant-a', name: 'Owner', email: 'owner@bhon.test', role: 'OWNER', status: 'ACTIVE', deletedAt: null },
    tenant: activeTenant,
  };

  await withPrismaStubs({
    session: { findUnique: async () => session },
    treatmentStage: {
      findFirst: async ({ where }) => where.id === 'stage-b' && where.tenantId === 'tenant-b' ? { treatmentId: 'treatment-b' } : null,
    },
  }, async () => {
    const response = await app.inject({
      method: 'PATCH', url: '/api/treatment-stages/stage-b/status',
      headers: { cookie: 'bhon_session=test-token', origin: 'https://app.bhon.test' },
      payload: { status: 'COMPLETED' },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'TREATMENT_STAGE_NOT_FOUND');
  });
});
