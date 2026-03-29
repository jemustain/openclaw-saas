import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { PLANS, PlanKey } from "@/lib/stripe/config";
import { getSession } from "@/lib/auth/session";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for upgrading to a paid plan.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan: PlanKey = body.plan ?? "pro";
    const returnUrl: string | undefined = body.returnUrl;

    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: session.email,
      metadata: { userId: session.userId, plan },
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: returnUrl
        ? `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: returnUrl
        ? `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`
        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    const detail = error?.message ?? String(error);
    return NextResponse.json(
      { error: "Failed to create checkout session", detail },
      { status: 500 },
    );
  }
}
