import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";

/**
 * POST /api/stripe/portal
 * Body: { customerId: string }
 *
 * Creates a Stripe Customer Portal session and returns the URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { customerId } = (await req.json()) as { customerId: string };

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe portal error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
