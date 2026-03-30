import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AssistantHero } from "./components/assistant-card";
import { QuickActions } from "./components/quick-actions";
import { UsageCard } from "./components/usage-card";
import { ConnectionsCard } from "./components/connections-card";
import { PlanCard } from "./components/plan-card";
import { AiModelCard } from "./components/ai-model-card";
import { UpgradeBanner } from "./components/upgrade-banner";
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

  // Stale session (user deleted/DB wiped) - redirect to sign in
  if (!user) {
    redirect("/auth/signin");
  }

  let plan: PlanKey = user?.plan ?? "free";
  if (!user?.plan) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.userId)
      .single();
    plan = profile?.plan ?? "free";
  }

  const messengers: string[] = user?.messengers ?? [];
  const aiProvider: string | null = user?.ai_provider ?? null;
  const aiApiKey: string | null = user?.ai_api_key ?? null;

  const isActive = assistant?.status === "active";
  const isProvisioning = assistant?.status === "provisioning" || assistant?.status === "destroying";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {upgraded && <UpgradeBanner />}

        {/* Hero */}
        <AssistantHero assistant={assistant ?? null} />

        {/* Quick Actions */}
        <QuickActions
          ipAddress={assistant?.ip_address}
          isActive={isActive}
          disabled={isProvisioning}
        />

        {/* Three-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Connections */}
          <div>
            <ConnectionsCard messengers={messengers} disabled={isProvisioning} />
          </div>

          {/* Col 2: AI Model + Usage stacked */}
          <div className="space-y-6">
            <AiModelCard provider={aiProvider} apiKey={aiApiKey} disabled={isProvisioning} />
            <UsageCard />
          </div>

          {/* Col 3: Plan */}
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
