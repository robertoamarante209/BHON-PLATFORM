import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPOINTMENT_STATUS_ROLES,
  APPOINTMENT_WRITE_ROLES,
  CLINICAL_STAGE_WRITE_ROLES,
  PATIENT_WRITE_ROLES,
} from '../src/domain/clinical-permissions.ts';

test('dentist pode executar ações de atendimento e etapas clínicas', () => {
  assert.equal(APPOINTMENT_STATUS_ROLES.includes('DENTIST'), true);
  assert.equal(CLINICAL_STAGE_WRITE_ROLES.includes('DENTIST'), true);
});

test('recepção pode manter cadastro e agenda, mas não alterar etapa clínica', () => {
  assert.equal(PATIENT_WRITE_ROLES.includes('RECEPTIONIST'), true);
  assert.equal(APPOINTMENT_WRITE_ROLES.includes('RECEPTIONIST'), true);
  assert.equal(APPOINTMENT_STATUS_ROLES.includes('RECEPTIONIST'), true);
  assert.equal(CLINICAL_STAGE_WRITE_ROLES.includes('RECEPTIONIST'), false);
});

test('papel de plataforma não recebe permissões operacionais de clínica', () => {
  for (const roles of [PATIENT_WRITE_ROLES, APPOINTMENT_WRITE_ROLES, APPOINTMENT_STATUS_ROLES, CLINICAL_STAGE_WRITE_ROLES]) {
    assert.equal(roles.includes('PLATFORM_OWNER'), false);
  }
});
