import assert from "node:assert/strict";
import test from "node:test";
import { zonedCalendarDayRange, zonedDayRange } from "../src/domain/time.ts";

test("calcula o dia clínico de São Paulo em UTC", () => {
  const range = zonedDayRange(new Date("2026-09-07T12:00:00.000Z"), "America/Sao_Paulo");
  assert.equal(range.start.toISOString(), "2026-09-07T03:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-09-08T03:00:00.000Z");
});

test("preserva a duração do dia na transição de horário de verão", () => {
  const range = zonedDayRange(new Date("2026-11-01T16:00:00.000Z"), "America/New_York");
  assert.equal((range.end.getTime() - range.start.getTime()) / 3_600_000, 25);
});

test("converte uma data civil da agenda para o intervalo UTC da clínica", () => {
  const range = zonedCalendarDayRange("2026-09-09", "America/Sao_Paulo");
  assert.equal(range?.start.toISOString(), "2026-09-09T03:00:00.000Z");
  assert.equal(range?.end.toISOString(), "2026-09-10T03:00:00.000Z");
  assert.equal(zonedCalendarDayRange("09/09/2026", "America/Sao_Paulo"), null);
  assert.equal(zonedCalendarDayRange("2026-02-31", "America/Sao_Paulo"), null);
});
