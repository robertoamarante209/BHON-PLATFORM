import type { User } from '../types';

export type ClinicPermission =
  | 'agenda.view' | 'agenda.create' | 'agenda.edit' | 'agenda.cancel'
  | 'patients.view' | 'patients.create' | 'patients.edit' | 'patients.export'
  | 'recovery.view' | 'recovery.contact' | 'recovery.manage'
  | 'finance.view' | 'finance.manage' | 'team.view' | 'team.manage';

const legacyDefaults: Partial<Record<User['role'], readonly ClinicPermission[]>> = {
  ADMIN: ['agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel', 'patients.view', 'patients.create', 'patients.edit', 'patients.export', 'recovery.view', 'recovery.contact', 'recovery.manage', 'finance.view', 'finance.manage', 'team.view', 'team.manage'],
  MANAGER: ['agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel', 'patients.view', 'patients.create', 'patients.edit', 'patients.export', 'recovery.view', 'recovery.contact', 'recovery.manage', 'finance.view', 'finance.manage', 'team.view'],
  DENTIST: ['agenda.view', 'agenda.create', 'agenda.edit', 'patients.view', 'patients.edit', 'recovery.view', 'recovery.contact'],
  RECEPTIONIST: ['agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel', 'patients.view', 'patients.create', 'patients.edit', 'recovery.view', 'recovery.contact'],
  FINANCIAL: ['patients.view', 'finance.view', 'finance.manage'],
  VIEWER: ['agenda.view', 'patients.view', 'recovery.view', 'finance.view', 'team.view'],
};

export function hasClinicPermission(user: Pick<User, 'role' | 'permissions'>, permission: ClinicPermission): boolean {
  if (user.role === 'OWNER' || user.role === 'PLATFORM_OWNER') return true;
  if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
  return legacyDefaults[user.role]?.includes(permission) === true;
}
