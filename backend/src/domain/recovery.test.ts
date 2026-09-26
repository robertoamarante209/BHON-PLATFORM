import assert from "node:assert/strict";
import test from "node:test";

import {
  isOutboundEligible,
  revokeConsent,
  scheduleCadence,
  scoreOpportunity,
} from "./recovery";

test("does not grant outbound eligibility to an imported patient without explicit WhatsApp consent", () => {
  const sequence = { status: "ACTIVE", scheduledAction: "OUTREACH" } as const;

  assert.equal(isOutboundEligible(null, sequence), false);
});

test("rejects malformed active consents that lack explicit WhatsApp authorization", () => {
  const sequence = { status: "ACTIVE", scheduledAction: "OUTREACH" } as const;
  const malformedConsents = [
    { channel: "EMAIL", authorization: "EXPLICIT", status: "ACTIVE" },
    { channel: "WHATSAPP", authorization: "IMPLICIT", status: "ACTIVE" },
    { channel: "WHATSAPP", status: "ACTIVE" },
  ];

  for (const consent of malformedConsents) {
    assert.equal(isOutboundEligible(consent as never, sequence), false);
  }
});

test("revoking consent ends an active sequence without a future scheduled action", () => {
  const sequence = Object.freeze({ status: "ACTIVE", scheduledAction: "OUTREACH" } as const);

  const transition = revokeConsent(sequence);

  assert.deepEqual(transition, {
    status: "ENDED",
    reason: "CONSENT_REVOKED",
    nextScheduledAction: null,
  });
  assert.deepEqual(sequence, { status: "ACTIVE", scheduledAction: "OUTREACH" });
});

test("schedules each approved cadence at its exact offsets", () => {
  const now = new Date("2026-09-26T10:00:00.000Z");

  const offsets = (sourceType: "MISSED_APPOINTMENT" | "BUDGET" | "INTERRUPTED_TREATMENT") =>
    scheduleCadence(sourceType, now).map((step) => ({
      kind: step.kind,
      offsetHours: (step.scheduledAt.getTime() - now.getTime()) / 3_600_000,
    }));

  assert.deepEqual(offsets("MISSED_APPOINTMENT"), [
    { kind: "OUTREACH", offsetHours: 0 },
    { kind: "OUTREACH", offsetHours: 48 },
    { kind: "END", offsetHours: 48 },
  ]);
  assert.deepEqual(offsets("BUDGET"), [
    { kind: "OUTREACH", offsetHours: 24 },
    { kind: "OUTREACH", offsetHours: 72 },
    { kind: "OUTREACH", offsetHours: 168 },
    { kind: "END", offsetHours: 168 },
  ]);
  assert.deepEqual(offsets("INTERRUPTED_TREATMENT"), [
    { kind: "OUTREACH", offsetHours: 168 },
    { kind: "OUTREACH", offsetHours: 504 },
    { kind: "OUTREACH", offsetHours: 1_080 },
    { kind: "END", offsetHours: 1_080 },
  ]);
});

test("scores value, urgency, and response likelihood deterministically with finite boundaries", () => {
  const opportunity = Object.freeze({ value: 80, urgency: 50, responseLikelihood: 40 });

  assert.equal(scoreOpportunity(opportunity), 63);
  assert.equal(scoreOpportunity(opportunity), 63);
  assert.equal(scoreOpportunity({ value: 1_000, urgency: Infinity, responseLikelihood: Number.NaN }), 80);
  assert.deepEqual(opportunity, { value: 80, urgency: 50, responseLikelihood: 40 });
});

test("recovery domain functions do not mutate their inputs", () => {
  const consent = Object.freeze({ channel: "WHATSAPP", authorization: "EXPLICIT", status: "ACTIVE" } as const);
  const sequence = Object.freeze({ status: "ACTIVE", scheduledAction: "OUTREACH" } as const);
  const scoreInput = Object.freeze({ value: 20, urgency: 30, responseLikelihood: 40 });
  const now = new Date("2026-09-26T10:00:00.000Z");
  const originalNow = now.getTime();

  isOutboundEligible(consent, sequence);
  revokeConsent(sequence);
  scoreOpportunity(scoreInput);
  scheduleCadence("BUDGET", now);

  assert.deepEqual(consent, { channel: "WHATSAPP", authorization: "EXPLICIT", status: "ACTIVE" });
  assert.deepEqual(sequence, { status: "ACTIVE", scheduledAction: "OUTREACH" });
  assert.deepEqual(scoreInput, { value: 20, urgency: 30, responseLikelihood: 40 });
  assert.equal(now.getTime(), originalNow);
});
