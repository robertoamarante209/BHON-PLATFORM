import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePermissions } from '../src/domain/permissions.ts';

test('aceita somente permissões conhecidas e remove duplicadas', () => {
  assert.deepEqual(sanitizePermissions(['agenda.view', 'agenda.view', 'patients.edit']), ['agenda.view', 'patients.edit']);
  assert.throws(() => sanitizePermissions(['platform.owner']), /permissão inválida/i);
});
