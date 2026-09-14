import test from 'node:test';
import assert from 'node:assert/strict';
import * as permissionModule from '../src/domain/permissions.ts';

const { hasPermission, sanitizePermissions } = permissionModule;

test('aceita somente permissões conhecidas e remove duplicadas', () => {
  assert.deepEqual(sanitizePermissions(['agenda.view', 'agenda.view', 'patients.edit']), ['agenda.view', 'patients.edit']);
  assert.throws(() => sanitizePermissions(['platform.owner']), /permissão inválida/i);
});

test('owner administra tudo e demais usuários respeitam a matriz individual', () => {
  assert.equal(hasPermission({ role: 'OWNER', permissions: [] }, 'team.manage'), true);
  assert.equal(hasPermission({ role: 'RECEPTIONIST', permissions: ['agenda.view'] }, 'agenda.view'), true);
  assert.equal(hasPermission({ role: 'RECEPTIONIST', permissions: ['agenda.view'] }, 'team.view'), false);
  assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'patients.view'), true);
  assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'finance.manage'), false);
});

test('separa cancelamento da edição comum da agenda', () => {
  assert.equal(permissionModule.permissionForAppointmentStatus?.('CANCELADO'), 'agenda.cancel');
  assert.equal(permissionModule.permissionForAppointmentStatus?.('EM_ATENDIMENTO'), 'agenda.edit');
});

test('reserva gestão da recuperação para ações que alteram a fila', () => {
  assert.equal(permissionModule.permissionForRecoveryAction?.('LOG_CONTACT'), 'recovery.contact');
  assert.equal(permissionModule.permissionForRecoveryAction?.('COMPLETE'), 'recovery.manage');
  assert.equal(permissionModule.permissionForRecoveryAction?.('POSTPONE'), 'recovery.manage');
  assert.equal(permissionModule.permissionForRecoveryAction?.('REASSIGN'), 'recovery.manage');
});
