import { createHash } from "node:crypto";

type RateLimitInput = { scope: string; identifier: string; maximumAttempts: number; windowMs: number };
type RateLimitDatabase = { securityRateLimit: { upsert(input: unknown): Promise<{ attempts: number; windowStartedAt: Date }> } };

function identifierDigest(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex");
}

export async function checkDurableRateLimit(input: RateLimitInput, database: RateLimitDatabase, now = new Date()) {
  const digest = identifierDigest(input.identifier);
  const row = await database.securityRateLimit.upsert({
    where: { scope_identifierDigest: { scope: input.scope, identifierDigest: digest } },
    create: { scope: input.scope, identifierDigest: digest, attempts: 1, windowStartedAt: now },
    update: { attempts: { increment: 1 }, updatedAt: now },
  });
  const elapsedMs = now.getTime() - new Date(row.windowStartedAt).getTime();
  if (elapsedMs >= input.windowMs) {
    await database.securityRateLimit.upsert({
      where: { scope_identifierDigest: { scope: input.scope, identifierDigest: digest } },
      create: { scope: input.scope, identifierDigest: digest, attempts: 1, windowStartedAt: now },
      update: { attempts: 1, windowStartedAt: now, updatedAt: now },
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (row.attempts <= input.maximumAttempts) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((input.windowMs - elapsedMs) / 1_000)) };
}
