import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AssistantCard } from "./components/assistant-card";
import { UsageCard } from "./components/usage-card";
import { PlanCard } from "./components/plan-card";
import { AiModelCard } from "./components/ai-model-card";
import { UpgradeBanner } from "./components/upgrade-banner";
import { MessengerMiniCard } from "./components/messenger-mini-card";
import type { PlanKey } from "@/lib/stripe/config";

const MESSENGER_KEYS = ["whatsapp", "telegram", "slack", "discord", "signal"];

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

  const aiProvider: string | null = user?.ai_provider ?? null;
  const aiApiKey: string | null = user?.ai_api_key ?? null;

  // Derive first name from session
  const firstName =
    session.email?.split("@")[0]?.split(".")[0] ??
    "there";
  const greeting = `Hey, ${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {upgraded && <UpgradeBanner />}
        <p className="text-xl font-medium text-white mb-8">{greeting}</p>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Assistant — spans 2 cols, 2 rows */}
          <div className="md:col-span-2 md:row-span-2">
            <AssistantCard assistant={assistant ?? null} />
          </div>

          {/* Right column stack */}
          <AiModelCard provider={aiProvider} apiKey={aiApiKey} />
          <PlanCard plan={plan} />
          <UsageCard />

          {/* Messenger mini-cards — 2x2 grid below assistant area */}
          {MESSENGER_KEYS.map((key) => (
            <MessengerMiniCard key={key} messengerKey={key} />
          ))}
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
