import assert from "node:assert/strict";
import test from "node:test";
import {
  isGlobalRateLimitExempt,
  isTrustedCookieRequest,
  SlidingWindowRateLimiter,
} from "../src/domain/security.ts";

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

test("consome cada requisição permitida durante a avaliação", () => {
  const limiter = new SlidingWindowRateLimiter(2, 60_000);

  assert.deepEqual(limiter.consume("ip:203.0.113.10", 1_000), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume("ip:203.0.113.10", 2_000), { allowed: true, retryAfterSeconds: 0 });
  assert.equal(limiter.consume("ip:203.0.113.10", 2_001).allowed, false);
});

test("isola o orçamento de requisições entre chaves", () => {
  const limiter = new SlidingWindowRateLimiter(1, 60_000);

  limiter.consume("ip:203.0.113.10", 1_000);

  assert.equal(limiter.consume("ip:198.51.100.20", 1_000).allowed, true);
});

test("calcula a espera inteira para resposta 429", () => {
  const limiter = new SlidingWindowRateLimiter(1, 60_000);
  limiter.consume("ip:203.0.113.10", 1_000);

  assert.deepEqual(limiter.consume("ip:203.0.113.10", 2_000), { allowed: false, retryAfterSeconds: 59 });
});

test("isenta probes de saúde e preflight OPTIONS do limite global", () => {
  assert.equal(isGlobalRateLimitExempt("GET", "/health/live"), true);
  assert.equal(isGlobalRateLimitExempt("GET", "/health/ready"), true);
  assert.equal(isGlobalRateLimitExempt("GET", "/health/db"), true);
  assert.equal(isGlobalRateLimitExempt("OPTIONS", "/api/patients"), true);
  assert.equal(isGlobalRateLimitExempt("GET", "/api/patients"), false);
});

