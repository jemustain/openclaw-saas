import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AssistantCard } from "./components/assistant-card";
import { UsageCard } from "./components/usage-card";
import { ConnectionsCard } from "./components/connections-card";
import { PlanCard } from "./components/plan-card";
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
    .select("plan, provider_preference, messengers")
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

  // Check provider token connections (Azure + DO need OAuth)
  let providerConnected = false;
  if (hosting === "oracle") {
    providerConnected = true; // We manage Oracle — always active
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
      <div className="mx-auto max-w-5xl">
        {upgraded && <UpgradeBanner />}
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssistantCard assistant={assistant ?? null} />
          <UsageCard />
          <ConnectionsCard
            hosting={hosting}
            providerConnected={providerConnected}
            messengers={messengers}
          />
          <PlanCard plan={plan} />
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
