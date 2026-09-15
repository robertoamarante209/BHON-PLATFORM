export type ClinicProtocolInput = { title: string; description?: string | null; steps: string[] };
export type ClinicProtocolParseResult =
  | { ok: true; value: { title: string; description: string | null; steps: string[] } }
  | { ok: false; code: "INVALID_PROTOCOL_TITLE" | "INVALID_PROTOCOL_STEPS" };

export function parseClinicProtocol(input: unknown): ClinicProtocolParseResult {
  if (!input || typeof input !== "object") return { ok: false, code: "INVALID_PROTOCOL_TITLE" };
  const { title, description, steps } = input as Partial<ClinicProtocolInput>;
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (normalizedTitle.length < 2 || normalizedTitle.length > 120) return { ok: false, code: "INVALID_PROTOCOL_TITLE" };
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 50) return { ok: false, code: "INVALID_PROTOCOL_STEPS" };
  const normalizedSteps = steps.map((step) => typeof step === "string" ? step.trim() : "");
  if (normalizedSteps.some((step) => step.length === 0 || step.length > 500)) return { ok: false, code: "INVALID_PROTOCOL_STEPS" };
  const normalizedDescription = typeof description === "string" ? description.trim() : "";
  return { ok: true, value: { title: normalizedTitle, description: normalizedDescription || null, steps: normalizedSteps } };
}
