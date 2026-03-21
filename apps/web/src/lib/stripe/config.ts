/**
 * Stripe product and price configuration for HandsOff tiers.
 *
 * PRICING MODEL: HandsOff charges for the software/service layer only.
 * Users pay their cloud provider separately (~$6-12/mo for the VM).
 * Users connect their own cloud account (DigitalOcean, later Azure).
 *
 * Set these environment variables to match the IDs created in your Stripe
 * dashboard (or via the setup instructions in docs/stripe-setup.md).
 */

export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
  },
  plus: {
    name: "Plus",
    priceMonthly: 900, // $9.00 in cents
    stripePriceId: process.env.STRIPE_PRICE_PLUS || "price_plus_placeholder",
  },
  pro: {
    name: "Pro",
    priceMonthly: 1900, // $19.00 in cents
    stripePriceId: process.env.STRIPE_PRICE_PRO || "price_pro_placeholder",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Map a Stripe price ID back to a plan key. */
export function planKeyFromPriceId(priceId: string): PlanKey | null {
  if (priceId === PLANS.plus.stripePriceId) return "plus";
  if (priceId === PLANS.pro.stripePriceId) return "pro";
  return null;
}
