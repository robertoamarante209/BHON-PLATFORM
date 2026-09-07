import assert from "node:assert/strict";
import test from "node:test";
import { intervalsOverlap, isAppointmentTransitionAllowed, parseAppointmentDuration } from "../src/domain/scheduling.ts";

test("aceita somente durações clínicas dentro do limite", () => {
  assert.equal(parseAppointmentDuration(undefined), 30);
  assert.equal(parseAppointmentDuration(45), 45);
  assert.equal(parseAppointmentDuration(4), null);
  assert.equal(parseAppointmentDuration(481), null);
  assert.equal(parseAppointmentDuration(12.5), null);
});

test("detecta sobreposição sem bloquear horários adjacentes", () => {
  const nine = new Date("2026-09-08T09:00:00.000Z");
  const nineThirty = new Date("2026-09-08T09:30:00.000Z");
  const nineFifteen = new Date("2026-09-08T09:15:00.000Z");
  assert.equal(intervalsOverlap(nine, 30, nineThirty, 30), false);
  assert.equal(intervalsOverlap(nine, 30, nineFifteen, 30), true);
});

test("impede transições que pulam etapas operacionais", () => {
  assert.equal(isAppointmentTransitionAllowed("CONFIRMADO", "NA_RECEPCAO"), true);
  assert.equal(isAppointmentTransitionAllowed("CONFIRMADO", "CONCLUIDO"), false);
  assert.equal(isAppointmentTransitionAllowed("CONCLUIDO", "CONFIRMADO"), false);
});

