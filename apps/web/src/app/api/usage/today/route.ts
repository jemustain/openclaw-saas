import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { apiError, ERR, handleApiError } from "@/lib/errors";

export async function GET() {
  const session = await getSession();
  if (!session)
    return apiError(ERR.UNAUTHORIZED, 401);

  const supabase: any = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: assistant } = await supabase
    .from("assistants")
    .select("id")
    .eq("user_id", session.userId)
    .neq("status", "destroyed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", session.userId)
    .single();

  const plan = user?.plan ?? "free";

  if (!assistant) {
    return NextResponse.json({
      messages_today: 0,
      messages_limit: plan === "free" ? 100 : null,
      hours_active: 0,
      hours_limit: plan === "free" ? 8 : 24,
      plan,
    });
  }

  const { data: usage } = await supabase
    .from("usage_logs")
    .select("messages_sent, hours_active")
    .eq("assistant_id", assistant.id)
    .eq("date", today)
    .single();

  return NextResponse.json({
    messages_today: usage?.messages_sent ?? 0,
    messages_limit: plan === "free" ? 100 : null,
    hours_active: usage?.hours_active ?? 0,
    hours_limit: plan === "free" ? 8 : 24,
    plan,
  });
}
