import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { planKeyFromPriceId } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { resumeAssistant, suspendAssistant } from "@/lib/vm/lifecycle";
import { handleCancellation } from "@/lib/billing/cancellation";
import { onSubscriptionConfirmed, onPaymentFailed as sendPaymentFailedEmail } from "@/lib/email/triggers";
import { env } from "@/lib/env";
import { apiError, handleApiError } from "@/lib/errors";

// Idempotency
import { markProcessed } from "@/lib/stripe/idempotency";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!markProcessed(event.id)) {
    console.log(`[stripe-webhook] Duplicate skipped: ${event.id} (${event.type})`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  console.log(`[stripe-webhook] Processing ${event.id} type=${event.type}`);

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
      case "customer.subscription.paused":
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.resumed":
        await handleSubscriptionResumed(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`[stripe-webhook] Unhandled: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error processing ${event.type} (${event.id}):`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  const plan = session.metadata?.plan ?? "pro";

  if (!userId) { console.error("[stripe-webhook] Checkout missing userId"); return; }

  console.log(`[stripe-webhook] Checkout: user=${userId} sub=${subscriptionId} cust=${customerId} plan=${plan}`);

  const supabase: any = await createClient();

  const { data: existingSub } = await supabase.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();

  if (existingSub) {
    const { error: subError } = await supabase.from("subscriptions").update({
      stripe_customer_id: customerId, stripe_subscription_id: subscriptionId,
      plan, status: "active", updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    if (subError) { console.error("[stripe-webhook] Update sub failed:", subError.message); throw subError; }
  } else {
    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId,
      plan, status: "active", updated_at: new Date().toISOString(),
    });
    if (subError) { console.error("[stripe-webhook] Insert sub failed:", subError.message); throw subError; }
  }

  const { error: userError } = await supabase.from("users").update({ plan, updated_at: new Date().toISOString() }).eq("id", userId);
  if (userError) console.error("[stripe-webhook] Update user plan failed:", userError.message);

  onSubscriptionConfirmed(userId).catch((err: any) => console.error("[stripe-webhook][email] confirm email failed:", err));

  if (plan !== "free") {
    const { data: assistant } = await supabase.from("assistants").select("id, status").eq("user_id", userId).eq("status", "suspended").single();
    if (assistant) {
      try { await resumeAssistant(assistant.id); console.log(`[stripe-webhook] Resumed ${assistant.id} after upgrade`); }
      catch (err) { console.error(`[stripe-webhook] Resume failed ${assistant.id}:`, err); }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? planKeyFromPriceId(priceId) : null;
  console.log(`[stripe-webhook] Sub updated: id=${subscription.id} plan=${plan} status=${subscription.status}`);

  const supabase: any = await createClient();
  const { data: existingSub } = await supabase.from("subscriptions").select("user_id, plan").eq("stripe_subscription_id", subscription.id).single();
  if (!existingSub) { console.error(`[stripe-webhook] No sub for ${subscription.id}`); return; }

  const previousPlan = existingSub.plan;
  const newPlan = plan ?? "free";
  const rawSub = subscription as any;
  const periodEnd = rawSub.current_period_end ? new Date(rawSub.current_period_end * 1000).toISOString() : null;

  const { error } = await supabase.from("subscriptions").update({
    plan: newPlan, status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    ...(periodEnd ? { current_period_end: periodEnd } : {}),
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id);
  if (error) { console.error("[stripe-webhook] Update failed:", error.message); throw error; }

  await supabase.from("users").update({ plan: newPlan, updated_at: new Date().toISOString() }).eq("id", existingSub.user_id);

  if (previousPlan === "free" && newPlan !== "free") {
    const { data: assistant } = await supabase.from("assistants").select("id, status").eq("user_id", existingSub.user_id).eq("status", "suspended").single();
    if (assistant) {
      try { await resumeAssistant(assistant.id); console.log(`[stripe-webhook] Resumed ${assistant.id} after upgrade`); }
      catch (err) { console.error("[stripe-webhook] Resume failed:", err); }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[stripe-webhook] Sub deleted: id=${subscription.id}`);
  const supabase: any = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_subscription_id", subscription.id).single();
  if (!sub) { console.error(`[stripe-webhook] No sub for ${subscription.id}`); return; }
  await handleCancellation(sub.user_id);
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  console.log(`[stripe-webhook] Sub paused: id=${subscription.id}`);
  const supabase: any = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_subscription_id", subscription.id).single();
  if (!sub) { console.error(`[stripe-webhook] No sub for ${subscription.id}`); return; }

  await supabase.from("subscriptions").update({ status: "paused", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);

  const { data: assistant } = await supabase.from("assistants").select("id, status").eq("user_id", sub.user_id).eq("status", "active").single();
  if (assistant) {
    try { await suspendAssistant(assistant.id); console.log(`[stripe-webhook] Suspended ${assistant.id} — paused`); }
    catch (err) { console.error(`[stripe-webhook] Suspend failed ${assistant.id}:`, err); }
  }
}

async function handleSubscriptionResumed(subscription: Stripe.Subscription) {
  console.log(`[stripe-webhook] Sub resumed: id=${subscription.id}`);
  const supabase: any = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_subscription_id", subscription.id).single();
  if (!sub) { console.error(`[stripe-webhook] No sub for ${subscription.id}`); return; }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? planKeyFromPriceId(priceId) : "pro";

  await supabase.from("subscriptions").update({ status: "active", plan, updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
  await supabase.from("users").update({ plan, updated_at: new Date().toISOString() }).eq("id", sub.user_id);

  const { data: assistant } = await supabase.from("assistants").select("id, status").eq("user_id", sub.user_id).eq("status", "suspended").single();
  if (assistant) {
    try { await resumeAssistant(assistant.id); console.log(`[stripe-webhook] Resumed ${assistant.id}`); }
    catch (err) { console.error(`[stripe-webhook] Resume failed ${assistant.id}:`, err); }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;
  console.log(`[stripe-webhook] Invoice paid: cust=${customerId} inv=${invoice.id}`);
  if (!subscriptionId) return;

  const supabase: any = await createClient();
  const { error } = await supabase.from("subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
  if (error) console.error("[stripe-webhook] invoice.paid update failed:", error.message);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  console.log(`[stripe-webhook] Payment failed: cust=${customerId} inv=${invoice.id}`);

  const supabase: any = await createClient();
  const { error } = await supabase.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_customer_id", customerId);
  if (error) console.error("[stripe-webhook] past_due update failed:", error.message);

  const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).single();
  if (sub?.user_id) {
    sendPaymentFailedEmail(sub.user_id).catch((err: any) => console.error("[stripe-webhook][email] payment-failed email failed:", err));
  }
}

// For testing - export via a separate module, not from the route
// See __tests__/webhook-idempotency.test.ts
