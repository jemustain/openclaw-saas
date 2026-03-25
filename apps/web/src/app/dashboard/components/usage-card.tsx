"use client";

interface UsageCardProps {
  plan: "free" | "starter" | "pro";
  messagesUsed?: number;
  hoursActive?: number;
}

export function UsageCard({ plan, messagesUsed = 0, hoursActive = 0 }: UsageCardProps) {
  const limit = plan === "free" ? 100 : null;
  const pct = limit ? Math.min((messagesUsed / limit) * 100, 100) : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Today&apos;s Usage</h2>

      <div className="mb-4">
        <p className="text-sm text-slate-400 mb-1">Messages today</p>
        {limit ? (
          <>
            <p className="text-slate-100 text-2xl font-bold">
              {messagesUsed} <span className="text-base font-normal text-slate-500">/ {limit}</span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct > 80 ? "bg-amber-500" : "bg-indigo-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              You&apos;ve used {messagesUsed} of your {limit} daily messages
            </p>
          </>
        ) : (
          <p className="text-slate-100 text-2xl font-bold">
            {messagesUsed} <span className="text-base font-normal text-slate-500">unlimited</span>
          </p>
        )}
      </div>

      <div>
        <p className="text-sm text-slate-400 mb-1">Hours active today</p>
        <p className="text-slate-100 text-2xl font-bold">
          {hoursActive.toFixed(1)}<span className="text-base font-normal text-slate-500">h</span>
        </p>
      </div>
    </div>
  );
}
