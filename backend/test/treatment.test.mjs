import assert from "node:assert/strict";
import test from "node:test";
import {
  isStageTransitionAllowed,
  isTreatmentTransitionAllowed,
  treatmentProgress,
} from "../src/domain/treatment.ts";

test("impede reabrir tratamento concluído e permite recuperar abandono", () => {
  assert.equal(isTreatmentTransitionAllowed("COMPLETED", "ACTIVE"), false);
  assert.equal(isTreatmentTransitionAllowed("ABANDONED", "ACTIVE"), true);
});

test("etapa concluída é terminal e etapa cancelada pode ser reaberta", () => {
  assert.equal(isStageTransitionAllowed("COMPLETED", "PENDING"), false);
  assert.equal(isStageTransitionAllowed("CANCELLED", "PENDING"), true);
});

test("progresso ignora etapas canceladas", () => {
  assert.deepEqual(treatmentProgress([
    { status: "COMPLETED" },
    { status: "PENDING" },
    { status: "CANCELLED" },
  ]), { stagesCount: 2, completedStagesCount: 1, progressPercent: 50 });
});
