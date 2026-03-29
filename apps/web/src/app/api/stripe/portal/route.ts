import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase: any = createClient();
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", session.userId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${env("NEXT_PUBLIC_APP_URL") || "http://localhost:3000"}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    console.error("Stripe portal error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
