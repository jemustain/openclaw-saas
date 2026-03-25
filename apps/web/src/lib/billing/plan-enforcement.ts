import { createClient } from "@/lib/supabase/server";

/**
 * Plan limits — two tiers: Free and Pro.
 */
export const FREE_LIMITS = { messagesPerDay: 100, hoursPerDay: 8, platforms: 1 } as const;
export const PRO_LIMITS = { messagesPerDay: Infinity, hoursPerDay: 24, platforms: Infinity } as const;

export type PlanLimits = { messagesPerDay: number; hoursPerDay: number; platforms: number };

const LIMITS_BY_PLAN: Record<string, PlanLimits> = {
  free: FREE_LIMITS,
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
  const today = new Date().toISOString().slice(0, 10);

  const { data: assistant } = await supabase
    .from("assistants")
    .select("user_id")
    .eq("id", assistantId)
    .single();

  if (!assistant) return { allowed: false, used: 0, limit: 0, plan: "free" };

  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", assistant.user_id)
    .single();

  const plan = user?.plan ?? "free";
  const limits = getLimitsForPlan(plan);

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
    limit: limits.messagesPerDay === Infinity ? -1 : limits.messagesPerDay,
    plan,
  };
}

/**
 * Check connected platforms against plan limit.
 */
export async function checkPlatformLimit(
  userId: string,
): Promise<{ allowed: boolean; connected: number; limit: number }> {
  const supabase: any = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = user?.plan ?? "free";
  const limits = getLimitsForPlan(plan);

  // Placeholder: count connected platforms from provider_tokens or config
  const connected = 0;
  return {
    allowed: connected < limits.platforms,
    connected,
    limit: limits.platforms === Infinity ? -1 : limits.platforms,
  };
}

/**
 * Full enforcement check for the sidecar to call.
 */
export async function enforceFreeTierLimits(
  assistantId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const msgCheck = await checkMessageLimit(assistantId);
  if (!msgCheck.allowed) {
    return { allowed: false, reason: "Daily message limit reached. Upgrade to Pro for unlimited messages." };
  }

  // Also check hours_active for free tier
  const limits = getLimitsForPlan(msgCheck.plan);
  if (limits.hoursPerDay < 24) {
    const supabase: any = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("usage_logs")
      .select("hours_active")
      .eq("assistant_id", assistantId)
      .eq("date", today)
      .single();

    const hoursUsed = usage?.hours_active ?? 0;
    if (hoursUsed >= limits.hoursPerDay) {
      return { allowed: false, reason: "Daily active hours limit reached. Upgrade to Pro for 24/7 uptime." };
    }
  }

  return { allowed: true };
}
