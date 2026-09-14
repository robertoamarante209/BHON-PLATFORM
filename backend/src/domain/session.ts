export type SessionRevocationClient = {
  session: {
    updateMany(input: {
      where: { id: string; revokedAt: null };
      data: { revokedAt: Date };
    }): Promise<{ count: number }>;
  };
};

export async function revokeSession(
  sessionId: string,
  client: SessionRevocationClient,
  revokedAt = new Date(),
): Promise<boolean> {
  const result = await client.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt },
  });

  return result.count > 0;
}

type SessionUserInput = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions?: unknown;
  specialty?: string | null;
  cro?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

type SessionTenantInput = {
  id: string;
  name: string;
  tradeName?: string | null;
  slug: string;
  status: string;
  planCode: string;
  createdAt: Date | string;
};

export function presentSessionUser(user: SessionUserInput, tenant: SessionTenantInput, activeRoomsCount: number) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    ...(Array.isArray(user.permissions) ? { permissions: user.permissions.filter((value): value is string => typeof value === 'string') } : {}),
    tenantId: user.tenantId,
    specialty: user.specialty,
    cro: user.cro,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      tradeName: tenant.tradeName,
      slug: tenant.slug,
      status: tenant.status,
      planCode: tenant.planCode,
      createdAt: tenant.createdAt,
      activeRoomsCount,
    },
  };
}
