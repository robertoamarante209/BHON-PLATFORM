import { hasPermission } from "./permissions.js";

type UserLike = { role: string; permissions?: unknown };
export const canManageClinicConfiguration = (user: UserLike) => user.role === "OWNER" || user.role === "PLATFORM_OWNER" || (user.role === "MANAGER" && !Array.isArray(user.permissions)) || hasPermission(user, "team.manage");
export const canReadAvailability = (user: UserLike) => canManageClinicConfiguration(user) || hasPermission(user, "agenda.view");
export const canReadProtocols = (user: UserLike) => canManageClinicConfiguration(user) || hasPermission(user, "patients.view");

export function normalizeProtocolInput(value: { title?: unknown; description?: unknown; steps?: unknown; isActive?: unknown }) {
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if (title.length < 2 || title.length > 160 || description.length > 4000 || !Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > 50) throw new Error("Protocolo inválido.");
  const steps = value.steps.map((step) => typeof step === "string" ? step.trim() : "");
  if (steps.some((step) => step.length < 1 || step.length > 1000)) throw new Error("Protocolo inválido.");
  return { title, description: description || null, steps, isActive: value.isActive === undefined ? true : value.isActive === true };
}
