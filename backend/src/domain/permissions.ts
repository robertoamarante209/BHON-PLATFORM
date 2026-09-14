export const CLINIC_PERMISSIONS = [
  'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.cancel',
  'patients.view', 'patients.create', 'patients.edit', 'patients.export',
  'recovery.view', 'recovery.contact', 'recovery.manage',
  'finance.view', 'finance.manage', 'team.view', 'team.manage',
] as const;

const allowed = new Set<string>(CLINIC_PERMISSIONS);

export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error('Permissões inválidas.');
  const values = [...new Set(input)];
  if (values.some((value) => typeof value !== 'string' || !allowed.has(value))) {
    throw new Error('Permissão inválida.');
  }
  return values as string[];
}
