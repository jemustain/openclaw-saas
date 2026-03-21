import { createClient } from "@/lib/supabase/server";
import type { PlanKey } from "@/lib/stripe/config";

/**
 * Plan limits by tier.
 */
export const FREE_LIMITS = { messagesPerDay: 100, hoursPerDay: 8, platforms: 1 } as const;
export const STARTER_LIMITS = { messagesPerDay: Infinity, hoursPerDay: 24, platforms: 3 } as const;
export const PRO_LIMITS = { messagesPerDay: Infinity, hoursPerDay: 24, platforms: Infinity } as const;

export type PlanLimits = { messagesPerDay: number; hoursPerDay: number; platforms: number };

const LIMITS_BY_PLAN: Record<string, PlanLimits> = {
  free: FREE_LIMITS,
  starter: STARTER_LIMITS,
  pro: PRO_LIMITS,
};

export function getLimitsForPlan(plan: string): PlanLimits {
  return LIMITS_BY_PLAN[plan] ?? FREE_LIMITS;
}

/**
 * Check whether an assistant has remaining message quota for today.
 */
export async function checkMessageLimit(
  assistantId: string,
): Promise<{ allowed: boolean; used: number; limit: number; plan: string }> {
  const supabase: any = await createClient();

  // Get assistant's user and plan
  const { data: assistant } = await supabase
    .from("assistants")
    .select("user_id")
    .eq("id", assistantId)
    .single();

  if (!assistant) {
    return { allowed: false, used: 0, limit: 0, plan: "free" };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", assistant.user_id)
    .single();

  const plan = sub?.plan ?? "free";
  const limits = getLimitsForPlan(plan);

  const today = new Date().toISOString().slice(0, 10);

  const { data: usage } = await supabase
    .from("usage_logs")
    .select("messages_sent")
    .eq("assistant_id", assistantId)
    .eq("date", today)
    .single();

  const used = usage?.messages_sent ?? 0;

  return {
    allowed: used < limits.messagesPerDay,
    used,
    limit: limits.messagesPerDay,
    plan,
  };
}

/**
 * Check whether a user can connect more platforms.
 */
export async function checkPlatformLimit(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase: any = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .single();

  const plan = sub?.plan ?? "free";
  const limits = getLimitsForPlan(plan);

  const { count } = await supabase
    .from("connected_platforms")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const used = count ?? 0;

  return {
    allowed: used < limits.platforms,
    used,
    limit: limits.platforms,
  };
}

/**
 * Middleware-style function for the sidecar to call before processing a message.
 * Returns { allowed, reason? } — sidecar should drop the message if not allowed.
 */
export async function enforceFreeTierLimits(
  assistantId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const result = await checkMessageLimit(assistantId);

  if (!result.allowed) {
    return {
      allowed: false,
      reason: `Daily message limit reached (${result.used}/${result.limit}). Upgrade to send more.`,
    };
  }

  return { allowed: true };
}
