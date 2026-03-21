import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { planKeyFromPriceId } from "@/lib/stripe/config";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers — replace TODO stubs with actual DB/notification logic
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  console.log(
    `Checkout completed: user=${userId} subscription=${subscriptionId} customer=${customerId}`,
  );

  // TODO: Upsert subscription in DB
  // await db.subscription.upsert({
  //   where: { userId },
  //   create: { userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, plan: session.metadata?.plan },
  //   update: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, plan: session.metadata?.plan },
  // });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? planKeyFromPriceId(priceId) : null;

  console.log(`Subscription updated: id=${subscription.id} plan=${plan}`);

  // TODO: Update plan in DB
  // await db.subscription.update({
  //   where: { stripeSubscriptionId: subscription.id },
  //   data: { plan: plan ?? "free", status: subscription.status },
  // });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: id=${subscription.id}`);

  // TODO: Downgrade to free and schedule VM suspension
  // await db.subscription.update({
  //   where: { stripeSubscriptionId: subscription.id },
  //   data: { plan: "free", status: "canceled" },
  // });
  // await scheduleVmSuspension(subscription.metadata?.userId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  console.log(
    `Payment failed: customer=${customerId} invoice=${invoice.id}`,
  );

  // TODO: Notify user and set grace period
  // const user = await db.user.findUnique({ where: { stripeCustomerId: customerId } });
  // if (user) {
  //   await sendPaymentFailedEmail(user.email);
  //   await db.subscription.update({
  //     where: { stripeCustomerId: customerId },
  //     data: { gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  //   });
  // }
}
