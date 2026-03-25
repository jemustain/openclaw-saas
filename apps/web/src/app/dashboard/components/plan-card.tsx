"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS, type PlanKey } from "@/lib/stripe/config";

const planLimits: Record<PlanKey, string[]> = {
  free: ["100 messages / day", "8 hours / day", "Basic skills"],
  pro: ["Unlimited messages", "24/7 availability", "All skills", "Priority support"],
};

export function PlanCard({ plan }: { plan: PlanKey }) {
  const info = PLANS[plan];
  const limits = planLimits[plan];
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
        setError(data.error ?? "Failed to create checkout session");
        setLoading(false);
      }
    } catch (err) {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Your Plan</h2>
      <p className="text-2xl font-bold text-indigo-400 mb-4">
        {info.name}
        {info.priceMonthly > 0 && (
          <span className="text-base font-normal text-slate-500">
            {" "}${(info.priceMonthly / 100).toFixed(0)}/mo
          </span>
        )}
      </p>

      <ul className="space-y-1 mb-4">
        {limits.map((l) => (
          <li key={l} className="text-sm text-slate-400 flex items-center gap-2">
            <span className="text-slate-600">•</span> {l}
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-500 mb-4">
        Cloud hosting billed separately by your provider (~$6-12/mo).
      </p>

      {plan === "free" && (
        <div className="pt-2 border-t border-slate-800">
          <p className="text-sm text-slate-400 mb-3">
            Upgrade to Pro for unlimited messages and 24/7 availability
          </p>
          {error && (
            <p className="text-sm text-red-400 mb-2">{error}</p>
          )}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting…" : "Upgrade to Pro — $12/mo"}
          </button>
        </div>
      )}

      {plan !== "free" && (
        <Link
          href="/api/stripe/portal"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          Manage subscription →
        </Link>
      )}
    </div>
  );
}
