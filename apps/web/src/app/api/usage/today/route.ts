import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!assistant) {
    return NextResponse.json({
      messagesUsed: 0,
      hoursActive: 0,
      plan: "free",
      limit: 100,
    });
  }

  const { data: usage } = await supabase
    .from("usage_logs")
    .select("messages_sent, hours_active")
    .eq("assistant_id", assistant.id)
    .eq("date", today)
    .single();

  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", session.userId)
    .single();

  const plan = user?.plan ?? "free";

  return NextResponse.json({
    messagesUsed: usage?.messages_sent ?? 0,
    hoursActive: usage?.hours_active ?? 0,
    plan,
    limit: plan === "free" ? 100 : null,
  });
}
