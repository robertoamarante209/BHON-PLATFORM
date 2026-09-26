import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePatientRow, patientIdentityKeys, reviewPatientRows } from '../src/domain/patient-import.ts';

test('Brazilian dates and formatted contact identifiers normalize without timezone changes', () => {
  const result = normalizePatientRow({ name: ' Ana Silva ', cpf: '529.982.247-25', phone: '+55 (11) 99999-1234', birthDate: '31/12/1990', email: ' ANA@EXAMPLE.COM ' });
  assert.deepEqual(result.errors, []);
  assert.equal(result.data.cpf, '52998224725');
  assert.equal(result.data.phone, '5511999991234');
  assert.equal(result.data.birthDate, '1990-12-31');
  assert.equal(result.data.email, 'ana@example.com');
});

test('invalid CPF, impossible dates, blank names and invalid email are rejected per row', () => {
  const result = normalizePatientRow({ name: ' ', cpf: '11111111111', birthDate: '31/02/2000', email: 'wrong' });
  assert.equal(result.errors.length, 4);
});

test('duplicate identity uses CPF or matching name and contact, never shared phone alone', () => {
  const existing = [{ id: 'existing', name: 'Ana Silva', cpf: '529.982.247-25', phone: '(11) 99999-1234' }];
  const result = reviewPatientRows([
    { name: 'Different name', cpf: '52998224725' },
    { name: 'ANA SÍLVA', phone: '5511999991234' },
    { name: 'Pedro Silva', phone: '11999991234' },
    { name: 'Pedro Silva', phone: '11999991234' },
  ], existing);
  assert.deepEqual(result.map(row => row.status), ['duplicate', 'duplicate', 'ready', 'duplicate']);
  assert.equal(result[0].duplicateId, 'existing');
  assert.equal(patientIdentityKeys({ name: 'Only name' }).length, 0);
});

test('preview never mutates original data and reports spreadsheet line numbers', () => {
  const rows = [{ name: 'Ana Silva' }, { name: '' }];
  const before = JSON.stringify(rows);
  const result = reviewPatientRows(rows, []);
  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(result.map(row => [row.row, row.status]), [[2, 'ready'], [3, 'invalid']]);
});
