export const ACTIVATION_EVENT_TYPES = [
  "ONBOARDING_OPENED",
  "CSV_TEMPLATE_DOWNLOADED",
  "PATIENT_IMPORT_COMPLETED",
  "DEMO_LOADED",
  "DEMO_REMOVED",
  "TEAM_CREATED",
  "AGENDA_OPENED",
  "OPPORTUNITY_PRIORITIZED",
  "SARAH_MESSAGE_PREPARED",
] as const;

export type ActivationEventType = typeof ACTIVATION_EVENT_TYPES[number];
export type ActivationStepKey = "PROFILE" | "PATIENTS" | "TEAM" | "AGENDA" | "OPPORTUNITY" | "SARAH_MESSAGE";
export const ACTIVATION_STEP_KEYS: readonly ActivationStepKey[] = ["PROFILE", "PATIENTS", "TEAM", "AGENDA", "OPPORTUNITY", "SARAH_MESSAGE"];

type ActivationCounts = {
  patients: number;
  teamMembers: number;
  appointments: number;
  opportunities: number;
};

type ProgressState = {
  clinicProfileReadyAt?: Date | null;
  patientReadyAt?: Date | null;
  teamReadyAt?: Date | null;
  appointmentReadyAt?: Date | null;
  followUpReadyAt?: Date | null;
  firstValueAt?: Date | null;
  dismissedAt?: Date | null;
} | null;

export type ActivationSnapshot = {
  dismissed: boolean;
  completedSteps: number;
  totalSteps: number;
  steps: Array<{ key: ActivationStepKey; complete: boolean }>;
  nextStep: { key: ActivationStepKey; complete: boolean } | null;
  eventContract: { acceptsOnly: readonly ActivationEventType[] };
};

type ActivationDatabase = {
  onboardingProgress: {
    findUnique: (args: { where: { tenantId: string } }) => Promise<ProgressState>;
  };
  patient: { count: (args: { where: { tenantId: string; deletedAt: null } }) => Promise<number> };
  user: { count: (args: { where: { tenantId: string; deletedAt: null; status: "ACTIVE" } }) => Promise<number> };
  appointment: { count: (args: { where: { tenantId: string } }) => Promise<number> };
  opportunity: { count: (args: { where: { tenantId: string; deletedAt: null } }) => Promise<number> };
  activationEvent: {
    create: (args: { data: { tenantId: string; actorUserId: string; type: ActivationEventType } }) => Promise<unknown>;
  };
};

export function createActivationService(database: ActivationDatabase) {
  return {
    async getSnapshot(tenantId: string) {
      const [progress, patients, teamMembers, appointments, opportunities] = await Promise.all([
        database.onboardingProgress.findUnique({ where: { tenantId } }),
        database.patient.count({ where: { tenantId, deletedAt: null } }),
        database.user.count({ where: { tenantId, deletedAt: null, status: "ACTIVE" } }),
        database.appointment.count({ where: { tenantId } }),
        database.opportunity.count({ where: { tenantId, deletedAt: null } }),
      ]);
      return getActivationSnapshot(progress, { patients, teamMembers, appointments, opportunities });
    },
    async recordEvent(input: {
      tenantId: string;
      actorUserId: string;
      type: ActivationEventType;
      metadata?: unknown;
    }) {
      if (!isActivationEventType(input.type)) throw new Error("ACTIVATION_EVENT_INVALID");
      return database.activationEvent.create({
        data: { tenantId: input.tenantId, actorUserId: input.actorUserId, type: input.type },
      });
    },
  };
}

export function isActivationEventType(value: unknown): value is ActivationEventType {
  return typeof value === "string" && ACTIVATION_EVENT_TYPES.includes(value as ActivationEventType);
}

export function isActivationStepKey(value: unknown): value is ActivationStepKey {
  return typeof value === "string" && ACTIVATION_STEP_KEYS.includes(value as ActivationStepKey);
}

export function getActivationSnapshot(progress: ProgressState, counts: ActivationCounts): ActivationSnapshot {
  const steps: ActivationSnapshot["steps"] = [
    { key: "PROFILE", complete: Boolean(progress?.clinicProfileReadyAt) },
    { key: "PATIENTS", complete: Boolean(progress?.patientReadyAt) || counts.patients > 0 },
    { key: "TEAM", complete: Boolean(progress?.teamReadyAt) || counts.teamMembers > 1 },
    { key: "AGENDA", complete: Boolean(progress?.appointmentReadyAt) || counts.appointments > 0 },
    { key: "OPPORTUNITY", complete: Boolean(progress?.followUpReadyAt) || counts.opportunities > 0 },
    { key: "SARAH_MESSAGE", complete: Boolean(progress?.firstValueAt) },
  ];
  const nextStep = steps.find((step) => !step.complete) ?? null;

  return {
    dismissed: Boolean(progress?.dismissedAt),
    completedSteps: steps.filter((step) => step.complete).length,
    totalSteps: steps.length,
    steps,
    nextStep,
    eventContract: { acceptsOnly: ACTIVATION_EVENT_TYPES },
  };
}
