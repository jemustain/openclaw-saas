import { createClient } from "@/lib/supabase/server";
import { suspendAssistant } from "./lifecycle";

export const FREE_PLAN_DAILY_HOURS = 8;

export async function getDailyUptimeHours(assistantId: string, now: Date = new Date()): Promise<number> {
  const supabase: any = await createClient();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_logs").select("duration_seconds")
    .eq("assistant_id", assistantId).eq("type", "vm_uptime")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", now.toISOString());

  if (error) { console.error(`[free-plan-limits] query failed for ${assistantId}:`, error.message); return 0; }
  return (data ?? []).reduce((s: number, r: any) => s + (r.duration_seconds ?? 0), 0) / 3600;
}

export async function hasRemainingHoursToday(assistantId: string, now?: Date): Promise<{ remaining: number; exceeded: boolean }> {
  const used = await getDailyUptimeHours(assistantId, now);
  const remaining = Math.max(0, FREE_PLAN_DAILY_HOURS - used);
  return { remaining, exceeded: remaining <= 0 };
}

export async function logVmUptime(assistantId: string, durationSeconds: number): Promise<void> {
  const supabase: any = await createClient();
  const { error } = await supabase.from("usage_logs").insert({
    assistant_id: assistantId, type: "vm_uptime",
    duration_seconds: durationSeconds, created_at: new Date().toISOString(),
  });
  if (error) console.error(`[free-plan-limits] log failed for ${assistantId}:`, error.message);
}

export async function enforceFreePlanLimits(): Promise<{ checked: number; suspended: number }> {
  const supabase: any = await createClient();
  const { data: assistants, error } = await supabase
    .from("assistants").select("id, user_id, users!inner(plan)")
    .eq("status", "active").eq("users.plan", "free");

  if (error) { console.error("[enforce-limits] query failed:", error.message); return { checked: 0, suspended: 0 }; }
  if (!assistants?.length) return { checked: 0, suspended: 0 };

  let suspended = 0;
  for (const a of assistants) {
    const { exceeded } = await hasRemainingHoursToday(a.id);
    if (exceeded) {
      try { await suspendAssistant(a.id); suspended++; console.log(`[enforce-limits] Suspended ${a.id}`); }
      catch (err) { console.error(`[enforce-limits] Failed to suspend ${a.id}:`, err); }
    }
  }
  return { checked: assistants.length, suspended };
}
