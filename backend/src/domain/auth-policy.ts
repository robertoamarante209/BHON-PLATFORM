type TenantAuthenticationState = {
  status: string;
  deletedAt: Date | null;
};

export function isTenantActiveForAuthentication(tenant: TenantAuthenticationState): boolean {
  return tenant.status === 'ACTIVE' && tenant.deletedAt === null;
}

export function resolveUniqueIdentity<T>(identities: readonly T[]):
  | { kind: 'not_found' }
  | { kind: 'ambiguous' }
  | { kind: 'unique'; identity: T } {
  if (identities.length === 0) return { kind: 'not_found' };
  if (identities.length > 1) return { kind: 'ambiguous' };
  return { kind: 'unique', identity: identities[0]! };
}
