import { createHash } from "node:crypto";

type RateLimitInput = { scope: string; identifier: string; maximumAttempts: number; windowMs: number };
type RateLimitDatabase = { securityRateLimit: {
  upsert(input: any): Promise<{ attempts: number; windowStartedAt: Date }>;
  findUnique?(input: any): Promise<{ attempts: number; windowStartedAt: Date } | null>;
  deleteMany?(input: any): Promise<unknown>;
} };

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

export async function isDurableRateLimitAllowed(input: RateLimitInput, database: RateLimitDatabase, now = new Date()) {
  if (!database.securityRateLimit.findUnique) return { allowed: true, retryAfterSeconds: 0 };
  const row = await database.securityRateLimit.findUnique({ where: { scope_identifierDigest: { scope: input.scope, identifierDigest: identifierDigest(input.identifier) } } });
  if (!row || now.getTime() - new Date(row.windowStartedAt).getTime() >= input.windowMs) return { allowed: true, retryAfterSeconds: 0 };
  if (row.attempts < input.maximumAttempts) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((input.windowMs - (now.getTime() - new Date(row.windowStartedAt).getTime())) / 1_000)) };
}

export async function recordDurableRateLimitFailure(input: RateLimitInput, database: RateLimitDatabase, now = new Date()) {
  return checkDurableRateLimit(input, database, now);
}

export async function resetDurableRateLimit(input: Pick<RateLimitInput, "scope" | "identifier">, database: RateLimitDatabase) {
  if (!database.securityRateLimit.deleteMany) return;
  await database.securityRateLimit.deleteMany({ where: { scope: input.scope, identifierDigest: identifierDigest(input.identifier) } });
}
