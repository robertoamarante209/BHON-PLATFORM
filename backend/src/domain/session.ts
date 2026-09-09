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
