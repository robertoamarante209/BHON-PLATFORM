import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isTenantActiveForAuthentication,
  resolveUniqueIdentity,
} from '../src/domain/auth-policy.ts';

test('aceita autenticação somente para tenant ACTIVE e não excluído', () => {
  assert.equal(isTenantActiveForAuthentication({ status: 'ACTIVE', deletedAt: null }), true);

  for (const status of ['TEST', 'PAYMENT_PENDING', 'SUSPENDED', 'CANCELLED']) {
    assert.equal(isTenantActiveForAuthentication({ status, deletedAt: null }), false, status);
  }
  assert.equal(isTenantActiveForAuthentication({ status: 'ACTIVE', deletedAt: new Date('2026-09-11T00:00:00Z') }), false);
});

test('resolve uma identidade única sem depender da ordem física dos dados', () => {
  const identity = { id: 'user-a', tenantId: 'tenant-a' };

  assert.deepEqual(resolveUniqueIdentity([identity]), { kind: 'unique', identity });
  assert.deepEqual(resolveUniqueIdentity([]), { kind: 'not_found' });
});

test('rejeita e-mail presente em múltiplos tenants sem expor as associações', () => {
  const result = resolveUniqueIdentity([
    { id: 'user-a', tenantId: 'tenant-a' },
    { id: 'user-b', tenantId: 'tenant-b' },
  ]);

  assert.deepEqual(result, { kind: 'ambiguous' });
});
