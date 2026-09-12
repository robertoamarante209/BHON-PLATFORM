import type { User } from '../types';

type ClinicalRole = User['role'];

const appointmentRoles: readonly ClinicalRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'DENTIST', 'RECEPTIONIST'];
const clinicalStageRoles: readonly ClinicalRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'DENTIST'];

export const canManageAppointments = (role: ClinicalRole): boolean => appointmentRoles.includes(role);
export const canChangeAppointmentStatus = (role: ClinicalRole): boolean => appointmentRoles.includes(role);
export const canChangeTreatmentStage = (role: ClinicalRole): boolean => clinicalStageRoles.includes(role);
