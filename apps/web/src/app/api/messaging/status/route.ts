import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface MessengerStatus {
  messenger: string;
  connected: boolean;
  configured: boolean;
  botLink?: string | null;
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase: any = createClient();

  // Get user's selected messengers
  const { data: user } = await supabase
    .from("users")
    .select("messengers")
    .eq("id", session.userId)
    .single();

  const messengers: string[] = user?.messengers ?? [];

  // Get user's active assistant to check messenger configs
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, status, telegram_bot_token, telegram_bot_username")
    .eq("user_id", session.userId)
    .neq("status", "destroyed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const statuses: MessengerStatus[] = messengers.map((m: string) => {
    const base: MessengerStatus = {
      messenger: m,
      connected: false,
      configured: false,
      botLink: null,
    };

    if (!assistant || assistant.status !== "active") return base;

    if (m === "telegram") {
      const hasToken = !!assistant.telegram_bot_token;
      const username = assistant.telegram_bot_username;
      return {
        ...base,
        configured: hasToken,
        connected: hasToken && assistant.status === "active",
        botLink: username ? `https://t.me/${username}` : null,
      };
    }

    // For other messengers, check if configured in assistant metadata
    // For now, return not configured until we add support
    return base;
  });

  return NextResponse.json({ statuses });
}
