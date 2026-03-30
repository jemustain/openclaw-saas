import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { planKeyFromPriceId } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { resumeAssistant } from "@/lib/vm/lifecycle";
import { handleCancellation } from "@/lib/billing/cancellation";
import { onSubscriptionConfirmed, onPaymentFailed as sendPaymentFailedEmail } from "@/lib/email/triggers";
import { env } from "@/lib/env";
import { apiError } from "@/lib/errors";

/**
 * POST /api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");

  if (!sig || !webhookSecret) {
    return apiError("Missing signature or webhook secret.", 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return apiError("Invalid signature.", 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error processing ${event.type}:`, err);
    return apiError("Webhook processing failed.", 500);
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers (unchanged internal logic)
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  const plan = session.metadata?.plan ?? "pro";

  if (!userId) {
    console.error("Checkout session missing userId in metadata");
    return;
  }

  console.log(`Checkout completed: user=${userId} subscription=${subscriptionId} customer=${customerId} plan=${plan}`);

  const supabase: any = await createClient();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingSub) {
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (subError) {
      console.error("Failed to update subscription:", subError.message);
      throw subError;
    }
  } else {
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan,
        status: "active",
        updated_at: new Date().toISOString(),
      });
    if (subError) {
      console.error("Failed to insert subscription:", subError.message);
      throw subError;
    }
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (userError) {
    console.error("Failed to update user plan:", userError.message);
  }

  onSubscriptionConfirmed(userId).catch((err) =>
    console.error("[email] Failed to send subscription-confirmed email:", err),
  );

  if (plan !== "free") {
    const { data: assistant } = await supabase
      .from("assistants")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "suspended")
      .single();

    if (assistant) {
      try {
        await resumeAssistant(assistant.id);
        console.log(`Resumed assistant ${assistant.id} after upgrade to ${plan}`);
      } catch (err) {
        console.error(`Failed to resume assistant ${assistant.id}:`, err);
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? planKeyFromPriceId(priceId) : null;

  console.log(`Subscription updated: id=${subscription.id} plan=${plan} status=${subscription.status}`);

  const supabase: any = await createClient();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id, plan")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!existingSub) {
    console.error(`No subscription found for stripe ID ${subscription.id}`);
    return;
  }

  const previousPlan = existingSub.plan;
  const newPlan = plan ?? "free";

  const rawSub = subscription as any;
  const periodEnd = rawSub.current_period_end
    ? new Date(rawSub.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: newPlan,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update subscription:", error.message);
    throw error;
  }

  await supabase
    .from("users")
    .update({ plan: newPlan, updated_at: new Date().toISOString() })
    .eq("id", existingSub.user_id);

  if (previousPlan === "free" && newPlan !== "free") {
    const { data: assistant } = await supabase
      .from("assistants")
      .select("id, status")
      .eq("user_id", existingSub.user_id)
      .eq("status", "suspended")
      .single();

    if (assistant) {
      try {
        await resumeAssistant(assistant.id);
        console.log(`Resumed assistant ${assistant.id} after upgrade to ${newPlan}`);
      } catch (err) {
        console.error(`Failed to resume assistant:`, err);
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: id=${subscription.id}`);

  const supabase: any = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!sub) {
    console.error(`No subscription found for stripe ID ${subscription.id}`);
    return;
  }

  await handleCancellation(sub.user_id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  console.log(`Payment failed: customer=${customerId} invoice=${invoice.id}`);

  const supabase: any = await createClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("Failed to update subscription status:", error.message);
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (sub?.user_id) {
    sendPaymentFailedEmail(sub.user_id).catch((err) =>
      console.error("[email] Failed to send payment-failed email:", err),
    );
  }
}
