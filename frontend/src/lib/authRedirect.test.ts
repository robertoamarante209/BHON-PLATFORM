import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath } from './authRedirect';

describe('resolvePostLoginPath', () => {
  it('restaura uma rota clínica pretendida para usuário da clínica', () => {
    expect(resolvePostLoginPath('DENTIST', '/login?next=%2Fclinic%2Fpatients%2Fpatient-a')).toBe('/clinic/patients/patient-a');
  });

  it('restaura uma rota da plataforma apenas para PLATFORM_OWNER', () => {
    expect(resolvePostLoginPath('PLATFORM_OWNER', '/login?next=%2Fplatform%2Fclinics')).toBe('/platform/clinics');
  });

  it('descarta URL externa ou área incompatível com o papel', () => {
    expect(resolvePostLoginPath('DENTIST', '/login?next=https%3A%2F%2Fevil.example')).toBe('/clinic/overview');
    expect(resolvePostLoginPath('DENTIST', '/login?next=%2Fplatform%2Fbilling')).toBe('/clinic/overview');
    expect(resolvePostLoginPath('PLATFORM_OWNER', '/login?next=%2Fclinic%2Fpatients')).toBe('/platform/overview');
  });
});
