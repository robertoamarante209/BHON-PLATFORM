import assert from "node:assert/strict";
import { test } from "node:test";
import { indicatorPeriodRange, percentage } from "../src/domain/indicators.ts";

test("percentual retorna nulo sem base e arredonda uma razão real", () => {
  assert.equal(percentage(0, 0), null);
  assert.equal(percentage(7, 8), 87.5);
});

test("períodos clínicos respeitam hoje, semana e mês em São Paulo", () => {
  const now = new Date("2026-09-09T15:00:00.000Z");

  assert.deepEqual(indicatorPeriodRange(now, "TODAY", "America/Sao_Paulo"), {
    start: new Date("2026-09-09T03:00:00.000Z"),
    end: new Date("2026-09-10T03:00:00.000Z"),
  });
  assert.deepEqual(indicatorPeriodRange(now, "WEEK", "America/Sao_Paulo"), {
    start: new Date("2026-09-07T03:00:00.000Z"),
    end: new Date("2026-09-14T03:00:00.000Z"),
  });
  assert.deepEqual(indicatorPeriodRange(now, "MONTH", "America/Sao_Paulo"), {
    start: new Date("2026-09-01T03:00:00.000Z"),
    end: new Date("2026-10-01T03:00:00.000Z"),
  });
});
