/**
 * Stripe product and price configuration for HandsOff.
 *
 * Two tiers: Free (limited) and Pro (unlimited).
 * Users pay their cloud provider separately for VM hosting.
 */

export const PLANS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    features: [
      "8 hours/day active window",
      "100 messages/day",
      "Basic skills",
      "1 cloud account",
    ],
    cta: "Get Started Free",
  },
  pro: {
    name: "Pro",
    priceMonthly: 1200, // $12.00 in cents
    stripePriceId: process.env.STRIPE_PRICE_PRO || "price_pro_placeholder",
    features: [
      "24/7 — assistant never sleeps",
      "Unlimited messages",
      "All skills unlocked",
      "Priority support",
    ],
    cta: "Go Pro",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Map a Stripe price ID back to a plan key. */
export function planKeyFromPriceId(priceId: string): PlanKey | null {
  if (priceId === PLANS.pro.stripePriceId) return "pro";
  return null;
}
