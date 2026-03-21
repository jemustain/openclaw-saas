import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssistantCard } from "./components/assistant-card";
import { UsageCard } from "./components/usage-card";
import { ConnectionsCard } from "./components/connections-card";
import { PlanCard } from "./components/plan-card";
import type { PlanKey } from "@/lib/stripe/config";

async function DashboardContent() {
  const supabase: any = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/signin");
  }

  // Fetch assistant status
  const { data: assistant } = await supabase
    .from("assistants")
    .select()
    .eq("user_id", user.id)
    .neq("status", "destroyed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch user profile for plan info
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan: PlanKey = profile?.plan ?? "free";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssistantCard assistant={assistant ?? null} />
          <UsageCard plan={plan} messagesUsed={0} hoursActive={0} />
          <ConnectionsCard />
          <PlanCard plan={plan} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <p className="text-slate-400">Loading dashboard…</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
