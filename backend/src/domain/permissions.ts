export const CLINIC_PERMISSIONS = [
  'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel',
  'patients.view', 'patients.create', 'patients.edit', 'patients.export',
  'recovery.view', 'recovery.contact', 'recovery.manage',
  'finance.view', 'finance.manage', 'team.view', 'team.manage',
] as const;

const allowed = new Set<string>(CLINIC_PERMISSIONS);
const legacyDefaults: Record<string, readonly string[]> = {
  ADMIN: CLINIC_PERMISSIONS,
  MANAGER: CLINIC_PERMISSIONS.filter((permission) => permission !== 'team.manage'),
  DENTIST: ['agenda.view', 'agenda.create', 'agenda.edit', 'patients.view', 'patients.edit', 'recovery.view', 'recovery.contact'],
  RECEPTIONIST: ['agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel', 'patients.view', 'patients.create', 'patients.edit', 'recovery.view', 'recovery.contact'],
  FINANCIAL: ['patients.view', 'finance.view', 'finance.manage'],
  VIEWER: ['agenda.view', 'patients.view', 'recovery.view', 'finance.view', 'team.view'],
};

export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error('Permissões inválidas.');
  const values = [...new Set(input)];
  if (values.some((value) => typeof value !== 'string' || !allowed.has(value))) {
    throw new Error('Permissão inválida.');
  }
  return values as string[];
}

export function hasPermission(
  user: { role: string; permissions?: unknown },
  permission: typeof CLINIC_PERMISSIONS[number],
): boolean {
  if (user.role === 'OWNER' || user.role === 'PLATFORM_OWNER') return true;
  if (!Array.isArray(user.permissions)) return legacyDefaults[user.role]?.includes(permission) === true;
  return user.permissions.includes(permission);
}

export function permissionForAppointmentStatus(status: string): typeof CLINIC_PERMISSIONS[number] {
  return status === 'CANCELADO' ? 'agenda.cancel' : 'agenda.edit';
}

export function permissionForRecoveryAction(action: string): typeof CLINIC_PERMISSIONS[number] {
  return action === 'LOG_CONTACT' ? 'recovery.contact' : 'recovery.manage';
}
