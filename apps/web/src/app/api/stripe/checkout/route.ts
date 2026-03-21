import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { PLANS, PlanKey } from "@/lib/stripe/config";

/**
 * POST /api/stripe/checkout
 * Body: { plan: "starter" | "pro", userId: string, email: string }
 *
 * Creates a Stripe Checkout Session and returns the URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email } = (await req.json()) as {
      plan: PlanKey;
      userId: string;
      email: string;
    };

    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      metadata: { userId, plan },
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
