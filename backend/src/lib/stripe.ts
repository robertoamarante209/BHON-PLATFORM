import Stripe from "stripe";
import { getStripeConfiguration } from "../domain/billing-catalog.js";

let client: Stripe | null = null;

export function getStripeClient() {
  if (client) return client;
  const { secretKey } = getStripeConfiguration();
  client = new Stripe(secretKey);
  return client;
}
