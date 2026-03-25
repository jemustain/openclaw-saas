import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceFreeTierLimits } from "@/lib/billing/plan-enforcement";

/**
 * POST /api/usage/record
 *
 * Sidecar reports usage periodically (every 5 minutes).
 * Body: { assistant_id, messages_sent, hours_active, api_tokens_used }
 * Auth: Bearer <SIDECAR_TOKEN> — validated against the assistant's sidecar_token column.
 *
 * Returns { recorded, throttled, reason? } so the sidecar knows whether to pause.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { assistant_id, messages_sent, hours_active, api_tokens_used } = body;

  if (!assistant_id) {
    return NextResponse.json(
      { error: "assistant_id required" },
      { status: 400 },
    );
  }

  const supabase: any = await createClient();

  // Verify sidecar token matches the assistant
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, user_id, sidecar_token")
    .eq("id", assistant_id)
    .single();

  if (!assistant) {
    return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
  }

  // Accept either per-assistant sidecar_token or the global SIDECAR_API_TOKEN
  const validToken =
    (assistant.sidecar_token && assistant.sidecar_token === token) ||
    token === process.env.SIDECAR_API_TOKEN;

  if (!validToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Upsert usage for today
  const { data: existing } = await supabase
    .from("usage_logs")
    .select("id, messages_sent, hours_active, api_tokens_used")
    .eq("assistant_id", assistant_id)
    .eq("date", today)
    .single();

  if (existing) {
    // The sidecar sends absolute counts for today, so take the max
    const { error } = await supabase
      .from("usage_logs")
      .update({
        messages_sent: Math.max(existing.messages_sent ?? 0, messages_sent ?? 0),
        hours_active: Math.max(existing.hours_active ?? 0, hours_active ?? 0),
        api_tokens_used: Math.max(existing.api_tokens_used ?? 0, api_tokens_used ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update usage log:", error.message);
      return NextResponse.json({ error: "Failed to record usage" }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from("usage_logs").insert({
      assistant_id,
      date: today,
      messages_sent: messages_sent ?? 0,
      hours_active: hours_active ?? 0,
      api_tokens_used: api_tokens_used ?? 0,
    });

    if (error) {
      console.error("Failed to insert usage log:", error.message);
      return NextResponse.json({ error: "Failed to record usage" }, { status: 500 });
    }
  }

  // Check free-tier limits and return throttle status
  const enforcement = await enforceFreeTierLimits(assistant_id);

  return NextResponse.json({
    recorded: true,
    throttled: !enforcement.allowed,
    reason: enforcement.reason,
  });
}
