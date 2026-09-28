import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDatabaseUrl } from "../src/lib/database-url.ts";

test("configura TLS compatível apenas para o pooler do Supabase", () => {
  const normalized = normalizeDatabaseUrl("postgresql://postgres.project:password@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require");
  assert.equal(new URL(normalized).searchParams.get("sslmode"), "no-verify");
});

test("preserva a validação de certificado fora do pooler do Supabase", () => {
  const normalized = normalizeDatabaseUrl("postgresql://postgres:password@db.example.com:5432/postgres?sslmode=verify-full");
  assert.equal(new URL(normalized).searchParams.get("sslmode"), "verify-full");
});
