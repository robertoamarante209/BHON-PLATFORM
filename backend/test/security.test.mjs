import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedCookieRequest, SlidingWindowRateLimiter } from "../src/domain/security.ts";

test("exige origem confiável somente em mutações autenticadas por cookie", () => {
  const allowed = ["https://app.bhon.com.br"];
  assert.equal(isTrustedCookieRequest("GET", "token", undefined, allowed), true);
  assert.equal(isTrustedCookieRequest("POST", undefined, undefined, allowed), true);
  assert.equal(isTrustedCookieRequest("PATCH", "token", "https://app.bhon.com.br", allowed), true);
  assert.equal(isTrustedCookieRequest("DELETE", "token", "https://evil.example", allowed), false);
  assert.equal(isTrustedCookieRequest("POST", "token", undefined, allowed), false);
});

test("bloqueia tentativas excedentes e libera após a janela", () => {
  const limiter = new SlidingWindowRateLimiter(2, 60_000);
  const key = "ip:email";
  limiter.recordFailure(key, 1_000);
  limiter.recordFailure(key, 2_000);
  assert.deepEqual(limiter.check(key, 3_000), { allowed: false, retryAfterSeconds: 58 });
  assert.deepEqual(limiter.check(key, 62_001), { allowed: true, retryAfterSeconds: 0 });
});

test("remove o bloqueio depois de autenticação válida", () => {
  const limiter = new SlidingWindowRateLimiter(1, 60_000);
  limiter.recordFailure("key", 1_000);
  assert.equal(limiter.check("key", 2_000).allowed, false);
  limiter.reset("key");
  assert.equal(limiter.check("key", 2_000).allowed, true);
});

