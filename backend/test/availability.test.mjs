import assert from "node:assert/strict";
import test from "node:test";

const { normalizeAvailability } = await import("../src/domain/availability.ts");

test("aceita múltiplos intervalos separados e os ordena", () => {
  assert.deepEqual(normalizeAvailability([
    { dayOfWeek: 1, start: "13:00", end: "18:00" },
    { dayOfWeek: 1, start: "08:00", end: "12:00" },
  ]), [
    { dayOfWeek: 1, start: "08:00", end: "12:00" },
    { dayOfWeek: 1, start: "13:00", end: "18:00" },
  ]);
});

for (const [name, intervals] of [
  ["dia fora da semana", [{ dayOfWeek: 7, start: "08:00", end: "09:00" }]],
  ["hora inválida", [{ dayOfWeek: 1, start: "8:00", end: "09:00" }]],
  ["intervalo invertido", [{ dayOfWeek: 1, start: "10:00", end: "09:00" }]],
  ["intervalos sobrepostos", [{ dayOfWeek: 1, start: "08:00", end: "10:00" }, { dayOfWeek: 1, start: "09:59", end: "11:00" }]],
]) test(`rejeita ${name}`, () => assert.throws(() => normalizeAvailability(intervals), /disponibilidade/i));

test("lista vazia representa semana explicitamente fechada", () => {
  assert.deepEqual(normalizeAvailability([]), []);
});
