"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, type PlanKey } from "@/lib/stripe/config";

const PLAN_LIMITS: Record<PlanKey, string> = {
  free: "100 msgs/day · 8h/day · Basic skills",
  pro: "Unlimited messages · 24/7 · All skills · Priority support",
};

export function PlanBanner({ plan }: { plan: PlanKey }) {
  const info = PLANS[plan];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(data.error ?? "Failed to create checkout");
        setLoading(false);
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-900/50 border border-slate-800 px-4 py-3">
      <span className="text-sm font-semibold text-indigo-400">{info.name}</span>
      {info.priceMonthly > 0 && (
        <span className="text-xs text-slate-500">
          ${(info.priceMonthly / 100).toFixed(0)}/mo
        </span>
      )}
      <span className="text-xs text-slate-500">{PLAN_LIMITS[plan]}</span>

      {error && <span className="text-xs text-red-400">{error}</span>}

      <div className="ml-auto flex items-center gap-2">
        {plan === "free" ? (
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Redirecting…" : "Upgrade to Pro"}
          </button>
        ) : (
          <Link
            href="/api/stripe/portal"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Manage subscription →
          </Link>
        )}
      </div>
    </div>
  );
}
