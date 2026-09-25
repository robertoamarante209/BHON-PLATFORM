export type PlannedAppointmentReminder = {
  channel: 'WHATSAPP' | 'INTERNAL';
  templateKey: string;
  scheduledFor: Date;
};

const minutes = (value: number) => value * 60_000;

/**
 * Cria uma fila previsível de comunicação, sem executar nenhum envio.
 * O trabalhador do provedor só poderá consumir estes eventos após a clínica
 * conectar um canal autorizado e registrar o consentimento aplicável.
 */
export function planAppointmentReminders(appointmentId: string, scheduledAt: Date, now = new Date()): PlannedAppointmentReminder[] {
  if (scheduledAt.getTime() <= now.getTime()) return [];

  const reminders: PlannedAppointmentReminder[] = [
    {
      channel: 'WHATSAPP',
      templateKey: `APPOINTMENT_CONFIRMATION:${appointmentId}`,
      scheduledFor: now,
    },
  ];

  const patientReminderAt = new Date(scheduledAt.getTime() - minutes(24 * 60));
  if (patientReminderAt.getTime() > now.getTime() + minutes(15)) {
    reminders.push({
      channel: 'WHATSAPP',
      templateKey: `APPOINTMENT_REMINDER_PATIENT_24H:${appointmentId}`,
      scheduledFor: patientReminderAt,
    });
  }

  const professionalReminderAt = new Date(scheduledAt.getTime() - minutes(60));
  if (professionalReminderAt.getTime() > now.getTime() + minutes(15)) {
    reminders.push({
      channel: 'INTERNAL',
      templateKey: `APPOINTMENT_REMINDER_PROFESSIONAL_1H:${appointmentId}`,
      scheduledFor: professionalReminderAt,
    });
  }

  return reminders;
}
