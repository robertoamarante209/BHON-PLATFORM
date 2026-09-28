import assert from 'node:assert/strict';
import test from 'node:test';
import { planAppointmentReminders } from '../src/domain/appointment-reminders.ts';

test('planeja confirmação e lembretes futuros sem disparar mensagens', () => {
  const now = new Date('2026-09-25T10:00:00.000Z');
  const planned = planAppointmentReminders('appointment-1', new Date('2026-09-27T12:00:00.000Z'), now);

  assert.deepEqual(planned.map((item) => item.templateKey), [
    'APPOINTMENT_CONFIRMATION:appointment-1',
    'APPOINTMENT_REMINDER_PATIENT_24H:appointment-1',
    'APPOINTMENT_REMINDER_PROFESSIONAL_1H:appointment-1',
  ]);
  assert.equal(planned[0].channel, 'WHATSAPP');
  assert.equal(planned[2].channel, 'INTERNAL');
});

test('não cria lembretes para atendimentos no passado', () => {
  const now = new Date('2026-09-25T10:00:00.000Z');
  assert.deepEqual(planAppointmentReminders('appointment-1', new Date('2026-09-25T09:00:00.000Z'), now), []);
});
