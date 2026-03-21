/**
 * Stripe product and price configuration for Claw4All tiers.
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
  starter: {
    name: "Starter",
    priceMonthly: 1200, // $12.00 in cents
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "price_starter_placeholder",
  },
  pro: {
    name: "Pro",
    priceMonthly: 2500, // $25.00 in cents
    stripePriceId: process.env.STRIPE_PRICE_PRO || "price_pro_placeholder",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Map a Stripe price ID back to a plan key. */
export function planKeyFromPriceId(priceId: string): PlanKey | null {
  if (priceId === PLANS.starter.stripePriceId) return "starter";
  if (priceId === PLANS.pro.stripePriceId) return "pro";
  return null;
}
