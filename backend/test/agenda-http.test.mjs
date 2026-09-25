import assert from 'node:assert/strict';
import test, { after } from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://bhon:bhon@localhost:5432/bhon';
process.env.DIRECT_URL ||= process.env.DATABASE_URL;
const { prisma } = await import('../src/lib/prisma.ts');
const { buildApp } = await import('../src/app.ts');
const app = buildApp({ logger: false, cookieSecret: 'test-only-cookie-secret-with-32-characters', allowedOrigins: ['https://app.bhon.test'] });
await app.ready();
after(() => app.close());
const start = new Date('2099-10-10T12:00:00Z');
const base = { id: 'appointment-a', tenantId: 'tenant-a', patientId: 'patient-a', professionalId: 'professional-a', roomId: 'room-a', scheduledAt: start, durationMinutes: 30, procedureName: 'Avaliação', status: 'CONFIRMADO', delayMinutes: 0, notes: null, patient: { id: 'patient-a', name: 'Paciente', recordNumber: '001' }, professional: { id: 'professional-a', name: 'Profissional' }, room: { id: 'room-a', name: 'Sala' } };
const payload = { patientId: base.patientId, professionalId: base.professionalId, roomId: base.roomId, scheduledAt: start.toISOString(), procedureName: base.procedureName };
const headers = { origin: 'https://app.bhon.test', cookie: 'bhon_session=test-session' };

async function fixture({ rows = [], role = 'RECEPTIONIST', relationTenant = 'tenant-a', onLock = () => {} } = {}, run) {
  const originals = [];
  const replace = (target, key, value) => { originals.push([target, key, target[key]]); target[key] = value; };
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some(condition => matches(row, condition));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return (!('not' in value) || row[key] !== value.not) && (!value.notIn || !value.notIn.includes(row[key])) && (!value.gte || row[key] >= value.gte) && (!value.lt || row[key] < value.lt);
    }
    return row[key] === value;
  });
  replace(prisma.session, 'findUnique', async () => ({ id: 'session', expiresAt: new Date('2100-01-01'), revokedAt: null, user: { id: 'user-a', tenantId: 'tenant-a', role, status: 'ACTIVE', deletedAt: null }, tenant: { id: 'tenant-a', status: 'ACTIVE', deletedAt: null } }));
  for (const delegate of ['patient', 'user', 'room']) replace(prisma[delegate], 'findFirst', async ({ where }) => where.tenantId === relationTenant ? { id: where.id, role: 'DENTIST' } : null);
  replace(prisma.appointment, 'findMany', async ({ where }) => rows.filter(row => matches(row, where)));
  replace(prisma.appointment, 'findFirst', async ({ where }) => rows.find(row => matches(row, where)) || null);
  replace(prisma.appointment, 'create', async ({ data }) => { const row = { ...base, ...data, id: 'created' }; rows.push(row); return row; });
  replace(prisma.appointment, 'update', async ({ where, data }) => { const row = rows.find(row => matches(row, where)); assert.ok(row); Object.assign(row, data); return row; });
  for (const delegate of ['timelineEvent', 'auditLog', 'followUp', 'notification']) replace(prisma[delegate], 'create', async () => ({}));
  replace(prisma, '$transaction', async callback => callback({ ...prisma, $executeRaw: async (_query, lockKey) => { assert.equal(lockKey, 'tenant-a'); onLock(rows); return 1; } }));
  try { await run(rows); } finally { for (const [target, key, value] of originals.reverse()) target[key] = value; }
}

for (const [dimension, shared] of [['PATIENT', 'patientId'], ['PROFESSIONAL', 'professionalId'], ['ROOM', 'roomId']]) {
  test(`create prevents overlapping ${dimension} without leaking appointment data`, async () => {
    const other = { ...base, patientId: 'other-patient', professionalId: 'other-professional', roomId: 'other-room', [shared]: base[shared] };
    await fixture({ rows: [other] }, async rows => {
      const response = await app.inject({ method: 'POST', url: '/api/appointments', headers, payload });
      assert.equal(response.statusCode, 409);
      assert.equal(response.json().conflict, dimension);
      assert.equal(response.json().code, 'SCHEDULE_CONFLICT');
      assert.equal(rows.length, 1);
      assert.ok(!response.body.includes('appointment-a'));
    });
  });
}

test('adjacent appointments and appointments in another tenant do not conflict', async () => {
  await fixture({ rows: [{ ...base, tenantId: 'tenant-b' }, { ...base, scheduledAt: new Date('2099-10-10T11:30:00Z') }] }, async () => {
    const response = await app.inject({ method: 'POST', url: '/api/appointments', headers, payload });
    assert.equal(response.statusCode, 201);
  });
});

for (const status of ['CANCELADO', 'FALTA']) test(`restoring a ${status} appointment checks patient availability`, async () => {
  await fixture({ rows: [{ ...base, status }, { ...base, id: 'other', roomId: 'other-room', professionalId: 'other-professional' }] }, async rows => {
    const response = await app.inject({ method: 'PATCH', url: '/api/appointments/appointment-a/status', headers, payload: { status: 'CONFIRMADO' } });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().conflict, 'PATIENT');
    assert.equal(rows[0].status, status);
  });
});

for (const [dimension, shared] of [['PATIENT', 'patientId'], ['PROFESSIONAL', 'professionalId'], ['ROOM', 'roomId']]) {
  test(`reschedule prevents overlapping ${dimension}`, async () => {
    const other = { ...base, id: 'other', scheduledAt: new Date('2099-10-10T14:00:00Z'), patientId: 'other-patient', professionalId: 'other-professional', roomId: 'other-room', [shared]: base[shared] };
    await fixture({ rows: [{ ...base }, other] }, async rows => {
      const response = await app.inject({ method: 'PATCH', url: '/api/appointments/appointment-a/reschedule', headers, payload: { scheduledAt: '2099-10-10T14:15:00Z' } });
      assert.equal(response.statusCode, 409);
      assert.equal(response.json().conflict, dimension);
      assert.equal(rows[0].scheduledAt, start);
    });
  });
}

for (const action of ['reschedule', 'status']) test(`${action} rereads the appointment after acquiring the tenant scheduling lock`, async () => {
  await fixture({ rows: [{ ...base }], onLock: rows => { rows[0] = { ...rows[0], status: 'CONCLUIDO' }; } }, async rows => {
    const response = await app.inject({ method: 'PATCH', url: `/api/appointments/appointment-a/${action}`, headers, payload: action === 'status' ? { status: 'NA_RECEPCAO' } : { scheduledAt: '2099-10-10T14:00:00Z' } });
    assert.equal(response.statusCode, 409);
    assert.equal(rows[0].status, 'CONCLUIDO');
    assert.equal(rows[0].scheduledAt, start);
  });
});

test('permitted operational transitions update the scoped appointment', async () => {
  await fixture({ rows: [{ ...base, status: 'AGUARDANDO_CONFIRMACAO' }] }, async rows => {
    for (const status of ['CONFIRMADO', 'NA_RECEPCAO', 'EM_ATENDIMENTO', 'CONCLUIDO']) {
      const response = await app.inject({ method: 'PATCH', url: '/api/appointments/appointment-a/status', headers, payload: { status } });
      assert.equal(response.statusCode, 200);
      assert.equal(rows[0].status, status);
    }
  });
});

test('reschedule edits procedure and clears notes while preserving tenant', async () => {
  await fixture({ rows: [{ ...base, notes: 'Anterior' }] }, async rows => {
    const response = await app.inject({ method: 'PATCH', url: '/api/appointments/appointment-a/reschedule', headers, payload: { scheduledAt: '2099-10-10T14:15:00Z', procedureName: 'Retorno', notes: '', durationMinutes: 45 } });
    assert.equal(response.statusCode, 200);
    assert.equal(rows[0].procedureName, 'Retorno');
    assert.equal(rows[0].notes, null);
    assert.equal(rows[0].durationMinutes, 45);
    assert.equal(rows[0].tenantId, 'tenant-a');
  });
});

for (const action of ['reschedule', 'status']) {
  test(`${action} rejects foreign appointment IDs and read-only roles`, async () => {
    const request = { method: 'PATCH', url: `/api/appointments/appointment-a/${action}`, headers, payload: action === 'status' ? { status: 'NA_RECEPCAO' } : { scheduledAt: '2099-10-10T14:00:00Z' } };
    await fixture({ rows: [{ ...base, tenantId: 'tenant-b' }] }, async () => assert.equal((await app.inject(request)).statusCode, 404));
    for (const role of ['VIEWER', 'FINANCIAL', 'PLATFORM_OWNER']) await fixture({ rows: [{ ...base }], role }, async () => assert.equal((await app.inject(request)).statusCode, 403));
  });
}

test('reads are tenant scoped and foreign related IDs cannot be used to create', async () => {
  await fixture({ rows: [{ ...base }, { ...base, id: 'foreign', tenantId: 'tenant-b' }] }, async () => {
    const response = await app.inject({ method: 'GET', url: '/api/appointments?date=2099-10-10', headers });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().map(row => row.id), ['appointment-a']);
  });
  await fixture({ relationTenant: 'tenant-b' }, async () => assert.equal((await app.inject({ method: 'POST', url: '/api/appointments', headers, payload })).statusCode, 400));
});

test('completed appointments reject editing and invalid status transitions', async () => {
  await fixture({ rows: [{ ...base, status: 'CONCLUIDO' }] }, async () => {
    for (const [path, body] of [['reschedule', { scheduledAt: payload.scheduledAt }], ['status', { status: 'CONFIRMADO' }]]) assert.equal((await app.inject({ method: 'PATCH', url: `/api/appointments/appointment-a/${path}`, headers, payload: body })).statusCode, 409);
  });
});
