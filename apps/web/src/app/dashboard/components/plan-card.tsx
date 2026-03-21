import Link from "next/link";
import { PLANS, type PlanKey } from "@/lib/stripe/config";

const planLimits: Record<PlanKey, string[]> = {
  free: ["100 messages / day", "1 cloud account", "Basic skills", "Community support"],
  plus: ["Unlimited messages", "2 cloud accounts", "All skills", "Priority support"],
  pro: ["Unlimited messages", "5 cloud accounts", "Custom skills + API access", "White-glove setup"],
};

export function PlanCard({ plan }: { plan: PlanKey }) {
  const info = PLANS[plan];
  const limits = planLimits[plan];

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
            Upgrade for unlimited messages and more cloud accounts
          </p>
          <Link
            href="/api/stripe/checkout"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
          >
            Upgrade
          </Link>
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
