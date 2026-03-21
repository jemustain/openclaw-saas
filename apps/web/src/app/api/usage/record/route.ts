import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/usage/record
 *
 * Sidecar reports usage after processing messages.
 * Body: { assistant_id, messages_sent, hours_active, api_tokens_used }
 * Auth: Bearer <SIDECAR_TOKEN>
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.SIDECAR_API_TOKEN) {
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
  const today = new Date().toISOString().slice(0, 10);

  // Check for existing record today
  const { data: existing } = await supabase
    .from("usage_logs")
    .select("id, messages_sent, hours_active, api_tokens_used")
    .eq("assistant_id", assistant_id)
    .eq("date", today)
    .single();

  if (existing) {
    // Increment existing counters
    const { error } = await supabase
      .from("usage_logs")
      .update({
        messages_sent: (existing.messages_sent ?? 0) + (messages_sent ?? 0),
        hours_active: (existing.hours_active ?? 0) + (hours_active ?? 0),
        api_tokens_used: (existing.api_tokens_used ?? 0) + (api_tokens_used ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update usage log:", error.message);
      return NextResponse.json({ error: "Failed to record usage" }, { status: 500 });
    }
  } else {
    // Insert new record
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

  return NextResponse.json({ recorded: true });
}
