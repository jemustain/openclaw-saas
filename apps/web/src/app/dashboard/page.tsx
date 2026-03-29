import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StatusBar } from "./components/status-bar";
import { AssistantCard } from "./components/assistant-card";
import { ConnectionsBadges } from "./components/connections-badges";
import { UsageCard } from "./components/usage-card";
import { AiModelCard } from "./components/ai-model-card";
import { PlanBanner } from "./components/plan-banner";
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

  // Fetch assistant status
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, status, ip_address, provider, region, created_at")
    .eq("user_id", session.userId)
    .neq("status", "destroyed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch user record
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

  const assistantStatus = assistant?.status ?? "offline";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sticky status bar */}
      <StatusBar
        status={assistantStatus}
        ipAddress={assistant?.ip_address}
        createdAt={assistant?.created_at}
        plan={plan}
      />

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-0">
        {upgraded && <UpgradeBanner />}

        {/* Section: Assistant */}
        <section className="py-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Assistant
          </h2>
          <AssistantCard assistant={assistant ?? null} />
        </section>

        <div className="border-t border-slate-800" />

        {/* Section: Connections */}
        <section className="py-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Connections
          </h2>
          <ConnectionsBadges
            hosting={hosting}
            providerConnected={providerConnected}
            messengers={messengers}
          />
        </section>

        <div className="border-t border-slate-800" />

        {/* Section: Configuration */}
        <section className="py-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AiModelCard provider={aiProvider} apiKey={aiApiKey} />
            <UsageCard />
          </div>
        </section>

        <div className="border-t border-slate-800" />

        {/* Section: Plan */}
        <section className="py-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Plan
          </h2>
          <PlanBanner plan={plan} />
        </section>
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
