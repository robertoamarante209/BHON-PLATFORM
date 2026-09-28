import { resolveBhonOffer, type BillingCycle } from "./billing-catalog.js";

export type TrialSignupInput = {
  clinicName?: unknown;
  ownerName?: unknown;
  ownerEmail?: unknown;
  username?: unknown;
  password?: unknown;
  clinicPhone?: unknown;
  ownerPhone?: unknown;
  billingCycle?: unknown;
  termsVersion?: unknown;
  privacyVersion?: unknown;
  acceptedTerms?: unknown;
  acceptedPrivacy?: unknown;
};

export type ValidatedTrialSignup = {
  clinicName: string;
  ownerName: string;
  ownerEmail: string;
  ownerEmailNormalized: string;
  username: string;
  password: string;
  clinicPhone: string;
  ownerPhone: string;
  billingCycle: BillingCycle;
  termsVersion: string;
  privacyVersion: string;
};

const asTrimmedString = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function validateTrialSignup(input: TrialSignupInput): { errors: string[]; value: ValidatedTrialSignup } {
  const clinicName = asTrimmedString(input.clinicName);
  const ownerName = asTrimmedString(input.ownerName);
  const ownerEmail = asTrimmedString(input.ownerEmail);
  const ownerEmailNormalized = ownerEmail.toLowerCase();
  const username = asTrimmedString(input.username).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  const clinicPhone = asTrimmedString(input.clinicPhone);
  const ownerPhone = asTrimmedString(input.ownerPhone);
  const termsVersion = asTrimmedString(input.termsVersion);
  const privacyVersion = asTrimmedString(input.privacyVersion);
  const cycle = asTrimmedString(input.billingCycle);
  const errors: string[] = [];

  if (clinicName.length < 2 || clinicName.length > 120) errors.push("Informe o nome da clínica.");
  if (ownerName.length < 2 || ownerName.length > 120) errors.push("Informe o responsável pela clínica.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmailNormalized) || ownerEmailNormalized.length > 320) errors.push("Informe um e-mail operacional válido.");
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) errors.push("Escolha um usuário entre 3 e 64 caracteres.");
  if (password.length < 12 || password.length > 200) errors.push("A senha deve ter entre 12 e 200 caracteres.");
  if (clinicPhone.length < 8 || clinicPhone.length > 32) errors.push("Informe o WhatsApp da clínica com DDD.");
  if (ownerPhone.length < 8 || ownerPhone.length > 32) errors.push("Informe o WhatsApp do responsável com DDD.");
  if (!resolveBhonOffer(cycle)) errors.push("Escolha um ciclo mensal ou anual.");
  if (!termsVersion) errors.push("A versão dos Termos de Uso é obrigatória.");
  if (!privacyVersion) errors.push("A versão da Política de Privacidade é obrigatória.");
  if (input.acceptedTerms !== true) errors.push("Aceite os Termos de Uso para continuar.");
  if (input.acceptedPrivacy !== true) errors.push("Aceite a Política de Privacidade para continuar.");

  return {
    errors,
    value: {
      clinicName, ownerName, ownerEmail, ownerEmailNormalized, username, password, clinicPhone, ownerPhone,
      billingCycle: cycle as BillingCycle, termsVersion, privacyVersion,
    },
  };
}
