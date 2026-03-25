import { createClient } from "@/lib/supabase/server";
import { destroyAssistant, suspendAssistant } from "@/lib/vm/lifecycle";
import { onSubscriptionCancelled } from "@/lib/email/triggers";

const GRACE_PERIOD_DAYS = 30;

/**
 * Handle subscription cancellation — downgrade to free and set grace period.
 */
export async function handleCancellation(userId: string): Promise<void> {
  const supabase: any = await createClient();

  const gracePeriodEnds = new Date(
    Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Update subscription to cancelled with grace period
  const { error: subError } = await supabase
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      grace_period_ends: gracePeriodEnds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (subError) {
    console.error("Failed to update subscription for cancellation:", subError.message);
    throw subError;
  }

  // Update user plan
  await supabase
    .from("users")
    .update({ plan: "free", updated_at: new Date().toISOString() })
    .eq("id", userId);

  // Suspend assistant immediately (don't destroy yet — grace period)
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (assistant) {
    try {
      await suspendAssistant(assistant.id);
      console.log(`Suspended assistant ${assistant.id} — grace period until ${gracePeriodEnds}`);
    } catch (err) {
      console.error(`Failed to suspend assistant ${assistant.id}:`, err);
    }
  }

  // Send cancellation email (fire-and-forget)
  onSubscriptionCancelled(userId, gracePeriodEnds).catch((err) =>
    console.error("[email] Failed to send subscription-cancelled email:", err),
  );
}

/**
 * Find cancelled subscriptions past their grace period and destroy VMs.
 * Call this from a cron job.
 */
export async function processExpiredGracePeriods(): Promise<{ processed: number }> {
  const supabase: any = await createClient();

  const now = new Date().toISOString();

  const { data: expiredSubs, error } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "canceled")
    .not("grace_period_ends", "is", null)
    .lt("grace_period_ends", now);

  if (error) {
    console.error("Failed to query expired grace periods:", error.message);
    return { processed: 0 };
  }

  if (!expiredSubs || expiredSubs.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;

  for (const sub of expiredSubs) {
    const { data: assistants } = await supabase
      .from("assistants")
      .select("id, status")
      .eq("user_id", sub.user_id)
      .in("status", ["active", "suspended"]);

    for (const assistant of assistants ?? []) {
      try {
        await destroyAssistant(assistant.id);
        console.log(`Destroyed assistant ${assistant.id} — grace period expired`);
        processed++;
      } catch (err) {
        console.error(`Failed to destroy assistant ${assistant.id}:`, err);
      }
    }

    // Clear grace period
    await supabase
      .from("subscriptions")
      .update({ grace_period_ends: null, updated_at: new Date().toISOString() })
      .eq("user_id", sub.user_id);
  }

  return { processed };
}
