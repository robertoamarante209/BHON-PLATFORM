export function normalizeGoogleEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function matchesPreauthorizedGoogleEmail(preauthorizedEmail: string | null | undefined, googleEmail: string): boolean {
  if (!preauthorizedEmail) return false;
  return normalizeGoogleEmail(preauthorizedEmail) === normalizeGoogleEmail(googleEmail);
}

export function mapGoogleUserRowToSessionUser<T extends { tenant_id: string }>(row: T, tenant: unknown): T & { tenantId: string; tenant: unknown } {
  return {
    ...row,
    tenantId: row.tenant_id,
    tenant,
  };
}
