import assert from "node:assert/strict";
import test from "node:test";
import { inactivityDays, isOpportunityTransitionAllowed } from "../src/domain/opportunity.ts";

test("funil não permite pular da triagem diretamente para conversão", () => {
  assert.equal(isOpportunityTransitionAllowed("TRIAGEM", "CONVERTIDO"), false);
  assert.equal(isOpportunityTransitionAllowed("TRIAGEM", "AVALIACAO"), true);
});

test("oportunidade perdida pode ser reaberta na triagem", () => {
  assert.equal(isOpportunityTransitionAllowed("PERDIDO", "TRIAGEM"), true);
  assert.equal(isOpportunityTransitionAllowed("CONVERTIDO", "TRIAGEM"), false);
});

test("inatividade usa último contato e nunca fica negativa", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  assert.equal(inactivityDays(new Date("2026-09-03T12:00:00Z"), new Date("2026-08-01T00:00:00Z"), now), 3);
  assert.equal(inactivityDays(null, new Date("2026-09-07T12:00:00Z"), now), 0);
});
