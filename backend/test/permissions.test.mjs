import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, sanitizePermissions } from '../src/domain/permissions.ts';

test('aceita somente permissões conhecidas e remove duplicadas', () => {
  assert.deepEqual(sanitizePermissions(['agenda.view', 'agenda.view', 'patients.edit']), ['agenda.view', 'patients.edit']);
  assert.throws(() => sanitizePermissions(['platform.owner']), /permissão inválida/i);
});

test('owner administra tudo e demais usuários respeitam a matriz individual', () => {
  assert.equal(hasPermission({ role: 'OWNER', permissions: [] }, 'team.manage'), true);
  assert.equal(hasPermission({ role: 'RECEPTIONIST', permissions: ['agenda.view'] }, 'agenda.view'), true);
  assert.equal(hasPermission({ role: 'RECEPTIONIST', permissions: ['agenda.view'] }, 'team.view'), false);
});
