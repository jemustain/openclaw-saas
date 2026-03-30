import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { PLANS, PlanKey } from "@/lib/stripe/config";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { apiError, handleApiError, ERR } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const body = await req.json().catch(() => ({}));
    const plan: PlanKey = body.plan ?? "pro";
    const returnUrl: string | undefined = body.returnUrl;

    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.stripePriceId) {
      return apiError("Invalid plan selected.", 400);
    }

    const appUrl = env("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: session.email,
      metadata: { userId: session.userId, plan },
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: returnUrl
        ? `${appUrl}${returnUrl}`
        : `${appUrl}/dashboard?upgraded=true`,
      cancel_url: returnUrl
        ? `${appUrl}/onboarding`
        : `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    return handleApiError(err, 'stripe/checkout');
  }
}
