export type BillingCycle = "MONTHLY" | "ANNUAL";

export type BhonOffer = {
  code: "BHON_CLINIC";
  amountInCents: number;
  priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_MONTHLY" | "STRIPE_PRICE_BHON_CLINIC_ANNUAL";
  trialDays: 14;
};

export const BHON_OFFERS: Record<BillingCycle, BhonOffer> = {
  MONTHLY: { code: "BHON_CLINIC", amountInCents: 29000, priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_MONTHLY", trialDays: 14 },
  ANNUAL: { code: "BHON_CLINIC", amountInCents: 290000, priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_ANNUAL", trialDays: 14 },
};

export function resolveBhonOffer(cycle: string): BhonOffer | null {
  return Object.hasOwn(BHON_OFFERS, cycle) ? BHON_OFFERS[cycle as BillingCycle] : null;
}

type BillingEnvironment = Record<string, string | undefined>;

export function getStripeConfiguration(env: BillingEnvironment = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const monthlyPriceId = env.STRIPE_PRICE_BHON_CLINIC_MONTHLY;
  const annualPriceId = env.STRIPE_PRICE_BHON_CLINIC_ANNUAL;

  if (!secretKey) throw new Error("STRIPE_SECRET_KEY não está definida.");
  const isTestKey = secretKey.startsWith("sk_test_");
  const isLiveKey = secretKey.startsWith("sk_live_");
  if (!isTestKey && !isLiveKey) throw new Error("STRIPE_SECRET_KEY não possui um formato aceito.");
  if (env.NODE_ENV === "production" && !isLiveKey) throw new Error("Produção exige uma chave Stripe live (sk_live_). ");
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET não está definida.");
  if (!monthlyPriceId) throw new Error("STRIPE_PRICE_BHON_CLINIC_MONTHLY não está definida.");
  if (!annualPriceId) throw new Error("STRIPE_PRICE_BHON_CLINIC_ANNUAL não está definida.");

  const configuredGraceDays = Number(env.STRIPE_BILLING_GRACE_DAYS ?? "7");
  const billingGraceDays = Number.isInteger(configuredGraceDays) && configuredGraceDays >= 0 && configuredGraceDays <= 30
    ? configuredGraceDays
    : 7;

  return { secretKey, webhookSecret, monthlyPriceId, annualPriceId, billingGraceDays, livemode: isLiveKey };
}
