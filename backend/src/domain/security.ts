const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const HEALTH_ENDPOINTS = new Set(["/health/live", "/health/ready", "/health/db"]);

export function isTrustedCookieRequest(
  method: string,
  sessionCookie: string | undefined,
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase()) || !sessionCookie) return true;
  return Boolean(origin && allowedOrigins.includes(origin));
}

export function isGlobalRateLimitExempt(method: string, requestUrl: string): boolean {
  if (method.toUpperCase() === "OPTIONS") return true;
  return HEALTH_ENDPOINTS.has(requestUrl.split("?", 1)[0]!);
}

type AttemptWindow = { attempts: number[] };

export class SlidingWindowRateLimiter {
  private readonly windows = new Map<string, AttemptWindow>();
  private readonly maximumAttempts: number;
  private readonly windowMs: number;
  private checks = 0;

  constructor(maximumAttempts: number, windowMs: number) {
    this.maximumAttempts = maximumAttempts;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const threshold = now - this.windowMs;
    const attempts = (this.windows.get(key)?.attempts || []).filter((attempt) => attempt > threshold);
    if (attempts.length === 0) this.windows.delete(key);
    else this.windows.set(key, { attempts });

    this.checks += 1;
    if (this.checks % 100 === 0) this.sweep(threshold);

    if (attempts.length < this.maximumAttempts) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((attempts[0]! + this.windowMs - now) / 1_000)),
    };
  }

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const evaluation = this.check(key, now);
    if (evaluation.allowed) {
      const attempts = this.windows.get(key)?.attempts || [];
      this.windows.set(key, { attempts: [...attempts, now] });
    }
    return evaluation;
  }

  recordFailure(key: string, now = Date.now()): void {
    const current = this.windows.get(key)?.attempts || [];
    this.windows.set(key, { attempts: [...current, now] });
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  private sweep(threshold: number): void {
    for (const [key, value] of this.windows) {
      const attempts = value.attempts.filter((attempt) => attempt > threshold);
      if (attempts.length === 0) this.windows.delete(key);
      else this.windows.set(key, { attempts });
    }
  }
}

