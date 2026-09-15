import assert from "node:assert/strict";
import test from "node:test";
import { availabilityScopeKey, parseAvailabilityIntervals } from "../src/domain/availability.ts";

test("normaliza intervalos válidos em ordem cronológica por dia", () => {
  const result = parseAvailabilityIntervals([
    { dayOfWeek: 2, start: "13:00", end: "17:00" },
    { dayOfWeek: 1, start: "13:00", end: "17:00" },
    { dayOfWeek: 1, start: "08:00", end: "12:00" },
  ]);

  assert.deepEqual(result, {
    ok: true,
    intervals: [
      { dayOfWeek: 1, start: "08:00", end: "12:00" },
      { dayOfWeek: 1, start: "13:00", end: "17:00" },
      { dayOfWeek: 2, start: "13:00", end: "17:00" },
    ],
  });
});

test("rejeita dia, horário e intervalo operacional inválidos", () => {
  assert.deepEqual(parseAvailabilityIntervals([{ dayOfWeek: 7, start: "08:00", end: "12:00" }]), { ok: false, code: "INVALID_DAY" });
  assert.deepEqual(parseAvailabilityIntervals([{ dayOfWeek: 1, start: "8:00", end: "12:00" }]), { ok: false, code: "INVALID_TIME" });
  assert.deepEqual(parseAvailabilityIntervals([{ dayOfWeek: 1, start: "12:00", end: "12:00" }]), { ok: false, code: "INVALID_INTERVAL" });
});

test("rejeita sobreposição e permite intervalos adjacentes no mesmo dia", () => {
  assert.deepEqual(parseAvailabilityIntervals([
    { dayOfWeek: 1, start: "08:00", end: "12:00" },
    { dayOfWeek: 1, start: "11:30", end: "13:00" },
  ]), { ok: false, code: "OVERLAPPING_INTERVAL" });

  assert.deepEqual(parseAvailabilityIntervals([
    { dayOfWeek: 1, start: "08:00", end: "12:00" },
    { dayOfWeek: 1, start: "12:00", end: "17:00" },
  ]), {
    ok: true,
    intervals: [
      { dayOfWeek: 1, start: "08:00", end: "12:00" },
      { dayOfWeek: 1, start: "12:00", end: "17:00" },
    ],
  });
});

test("mantém a disponibilidade da clínica e de cada profissional em escopos distintos", () => {
  assert.equal(availabilityScopeKey(), "CLINIC");
  assert.equal(availabilityScopeKey("  professional-7  "), "professional-7");
});
