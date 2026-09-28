export const CONTACT_CHANNELS = ["WHATSAPP", "PHONE", "EMAIL"] as const;

export type ContactChannel = (typeof CONTACT_CHANNELS)[number];
export type ContactChannelStatus = "NOT_INFORMED" | "ALLOWED" | "REFUSED";

export type ContactPreferences = Partial<Record<"whatsapp" | "phone" | "email", ContactChannelStatus>>;

export type RecoveryEligibility =
  | { eligible: true }
  | { eligible: false; code: "CONTACT_CHANNEL_NOT_ALLOWED" | "CONTACT_CHANNEL_REFUSED" };

const preferenceKeyByChannel: Record<ContactChannel, keyof ContactPreferences> = {
  WHATSAPP: "whatsapp",
  PHONE: "phone",
  EMAIL: "email",
};

export function evaluateRecoveryEligibility(preferences: ContactPreferences | null | undefined, channel: ContactChannel): RecoveryEligibility {
  const status = preferences?.[preferenceKeyByChannel[channel]] ?? "NOT_INFORMED";
  if (status === "ALLOWED") return { eligible: true };
  return { eligible: false, code: status === "REFUSED" ? "CONTACT_CHANNEL_REFUSED" : "CONTACT_CHANNEL_NOT_ALLOWED" };
}
