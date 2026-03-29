import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./components/dashboard-client";
import type { PlanKey } from "@/lib/stripe/config";

async function DashboardContent() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const supabase: any = createClient();

  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, status, ip_address, provider, region, created_at")
    .eq("user_id", session.userId)
    .neq("status", "destroyed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: user } = await supabase
    .from("users")
    .select("plan, provider_preference, messengers, ai_provider, ai_api_key")
    .eq("id", session.userId)
    .single();

  let plan: PlanKey = user?.plan ?? "free";
  if (!user?.plan) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.userId)
      .single();
    plan = profile?.plan ?? "free";
  }

  const hosting: string | undefined = user?.provider_preference ?? undefined;
  const messengers: string[] = user?.messengers ?? [];
  const aiProvider: string | null = user?.ai_provider ?? null;
  const aiApiKey: string | null = user?.ai_api_key ?? null;

  let providerConnected = false;
  if (hosting === "oracle") {
    providerConnected = true;
  } else if (hosting) {
    const { data: token } = await supabase
      .from("provider_tokens")
      .select("id")
      .eq("user_id", session.userId)
      .eq("provider", hosting)
      .single();
    providerConnected = !!token;
  }

  return (
    <DashboardClient
      assistant={assistant ?? null}
      plan={plan}
      hosting={hosting}
      providerConnected={providerConnected}
      messengers={messengers}
      aiProvider={aiProvider}
      aiApiKey={aiApiKey}
    />
  );
}

export default async function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <p className="text-slate-400">Loading…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
