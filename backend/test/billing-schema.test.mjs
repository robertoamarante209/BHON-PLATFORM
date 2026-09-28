import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

test("billing schema stores only the durable lifecycle data required for trials", () => {
  assert.match(schema, /model TrialSignup/);
  assert.match(schema, /model LegalConsent/);
  assert.match(schema, /model StripeWebhookEvent/);
  assert.match(schema, /model OnboardingProgress/);
  assert.match(schema, /stripeEventId\s+String\s+@unique/);
  assert.match(schema, /firstValueAt\s+DateTime\?/);
  assert.match(schema, /stripeCustomerId\s+String\?\s+@unique/);
});
