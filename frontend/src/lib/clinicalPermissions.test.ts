import { describe, expect, it } from 'vitest';
import {
  canChangeAppointmentStatus,
  canChangeTreatmentStage,
  canManageAppointments,
} from './clinicalPermissions';

describe('clinical permissions', () => {
  it('permite ao dentista executar atendimento e atualizar etapas clínicas', () => {
    expect(canManageAppointments('DENTIST')).toBe(true);
    expect(canChangeAppointmentStatus('DENTIST')).toBe(true);
    expect(canChangeTreatmentStage('DENTIST')).toBe(true);
  });

  it('não mostra à recepção a mudança de etapa clínica indisponível no servidor', () => {
    expect(canManageAppointments('RECEPTIONIST')).toBe(true);
    expect(canChangeAppointmentStatus('RECEPTIONIST')).toBe(true);
    expect(canChangeTreatmentStage('RECEPTIONIST')).toBe(false);
  });

  it('mantém o papel de plataforma fora das ações de clínica', () => {
    expect(canManageAppointments('PLATFORM_OWNER')).toBe(false);
    expect(canChangeAppointmentStatus('PLATFORM_OWNER')).toBe(false);
    expect(canChangeTreatmentStage('PLATFORM_OWNER')).toBe(false);
  });
});
