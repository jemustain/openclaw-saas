"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, type PlanKey } from "@/lib/stripe/config";

const planLimits: Record<PlanKey, string[]> = {
  free: ["100 messages/day", "8 hours/day", "Basic skills"],
  pro: ["Unlimited messages", "24/7 availability", "All skills", "Priority support"],
};

export function PlanBanner({ plan }: { plan: PlanKey }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = PLANS[plan];
  const limits = planLimits[plan];

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ? `${data.error}${data.detail ? ": " + data.detail : ""}` : "Failed to create checkout session");
        setLoading(false);
      }
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  if (plan === "free") {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-indigo-900/50 bg-indigo-950/30 px-4 py-3">
        <div>
          <span className="text-sm text-slate-300">
            <span className="font-medium text-white">{info.name}</span>
            {" — "}
            {limits.join(" · ")}
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud hosting billed separately by your provider (~$6-12/mo).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Redirecting…" : "Upgrade to Pro — $12/mo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
      <span className="text-sm text-slate-300">
        <span className="font-medium text-indigo-400">{info.name}</span>
        {info.priceMonthly > 0 && (
          <span className="text-slate-500"> — ${(info.priceMonthly / 100).toFixed(0)}/mo</span>
        )}
        {" · "}
        {limits.join(" · ")}
      </span>
      <Link
        href="/api/stripe/portal"
        className="text-sm text-indigo-400 hover:text-indigo-300 whitespace-nowrap"
      >
        Manage subscription →
      </Link>
    </div>
  );
}
