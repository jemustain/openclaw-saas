import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AssistantHero } from "./components/assistant-card";
import { UsageCard } from "./components/usage-card";
import { ConnectionsCard } from "./components/connections-card";
import { PlanCard } from "./components/plan-card";
import { AiModelCard } from "./components/ai-model-card";
import { UpgradeBanner } from "./components/upgrade-banner";
import { QuickActions } from "./components/quick-actions";
import type { PlanKey } from "@/lib/stripe/config";

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const upgraded = params?.upgraded === "true";

  const session = await getSession();
  if (!session) {
    redirect("/auth/signin");
  }

  const supabase: any = createClient();

  // Fetch assistant status (include provider info)
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, status, ip_address, provider, region, created_at")
    .eq("user_id", session.userId)
    .neq("status", "destroyed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch user record for plan, hosting preference, and messengers
  const { data: user } = await supabase
    .from("users")
    .select("plan, provider_preference, messengers, ai_provider, ai_api_key")
    .eq("id", session.userId)
    .single();

  // Fallback to profiles table for plan if users table doesn't have it
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

  // Check provider token connections (Azure + DO need OAuth)
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
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {upgraded && <UpgradeBanner />}

        {/* Hero Section — Full-width assistant status */}
        <AssistantHero assistant={assistant ?? null} />

        {/* Quick Actions Bar */}
        <QuickActions ipAddress={assistant?.ip_address ?? null} status={assistant?.status ?? null} />

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Messengers */}
          <div>
            <ConnectionsCard
              hosting={hosting}
              providerConnected={providerConnected}
              messengers={messengers}
            />
          </div>

          {/* Column 2: AI Model + Usage stacked */}
          <div className="space-y-6">
            <AiModelCard provider={aiProvider} apiKey={aiApiKey} />
            <UsageCard />
          </div>

          {/* Column 3: Plan */}
          <div>
            <PlanCard plan={plan} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <p className="text-slate-400">Loading dashboard…</p>
        </div>
      }
    >
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
