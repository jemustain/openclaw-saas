import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { PLANS, PlanKey } from "@/lib/stripe/config";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for upgrading to a paid plan.
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
