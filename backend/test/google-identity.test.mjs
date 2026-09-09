import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeGoogleEmail,
  matchesPreauthorizedGoogleEmail,
  mapGoogleUserRowToSessionUser,
} from '../src/domain/google-identity.ts';

test('normalizes and matches a preauthorized Google email case-insensitively', () => {
  assert.equal(normalizeGoogleEmail('  RobertoAmarante209@GMAIL.COM '), 'robertoamarante209@gmail.com');
  assert.equal(matchesPreauthorizedGoogleEmail('robertoamarante209@gmail.com', ' ROBERTOAMARANTE209@GMAIL.COM '), true);
});

test('maps the Google database row tenant_id to the session user tenantId', () => {
  const row = {
    id: 'user-1',
    tenant_id: 'tenant-1',
    name: 'Roberto Amarante',
    email: 'roberto@odontoprime.com.br',
    role: 'OWNER',
    status: 'ACTIVE',
    specialty: null,
    cro: null,
    phone: null,
    avatar_url: null,
    google_subject: null,
    google_email: 'robertoamarante209@gmail.com',
  };
  const tenant = { id: 'tenant-1', rooms: [] };

  const user = mapGoogleUserRowToSessionUser(row, tenant);

  assert.equal(user.tenantId, 'tenant-1');
  assert.equal(user.tenant.id, 'tenant-1');
  assert.equal(user.email, row.email);
});
