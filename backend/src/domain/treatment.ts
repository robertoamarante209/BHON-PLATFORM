export const treatmentTransitions = {
  LEAD: ["QUOTED", "CANCELLED"],
  QUOTED: ["PENDING", "ACTIVE", "CANCELLED"],
  PENDING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["SCHEDULED", "IN_PROGRESS", "PAUSED", "RISK_OF_ABANDONMENT", "COMPLETED", "CANCELLED", "ABANDONED"],
  SCHEDULED: ["IN_PROGRESS", "ACTIVE", "PAUSED", "CANCELLED", "ABANDONED"],
  IN_PROGRESS: ["ACTIVE", "PAUSED", "RISK_OF_ABANDONMENT", "COMPLETED", "CANCELLED", "ABANDONED"],
  PAUSED: ["ACTIVE", "IN_PROGRESS", "CANCELLED", "ABANDONED"],
  RISK_OF_ABANDONMENT: ["ACTIVE", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED", "ABANDONED"],
  COMPLETED: [],
  CANCELLED: [],
  ABANDONED: ["ACTIVE"],
} as const;

export type TreatmentState = keyof typeof treatmentTransitions;

export function isTreatmentTransitionAllowed(from: TreatmentState, to: TreatmentState): boolean {
  return (treatmentTransitions[from] as readonly TreatmentState[]).includes(to);
}

export const stageTransitions = {
  PENDING: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  SCHEDULED: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["PENDING", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["PENDING"],
} as const;

export type StageState = keyof typeof stageTransitions;

export function isStageTransitionAllowed(from: StageState, to: StageState): boolean {
  return (stageTransitions[from] as readonly StageState[]).includes(to);
}

export function treatmentProgress(stages: readonly { status: StageState }[]) {
  const total = stages.filter((stage) => stage.status !== "CANCELLED").length;
  const completed = stages.filter((stage) => stage.status === "COMPLETED").length;
  return {
    stagesCount: total,
    completedStagesCount: completed,
    progressPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
