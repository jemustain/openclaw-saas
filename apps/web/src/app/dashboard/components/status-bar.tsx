"use client";

import { useEffect, useState } from "react";
import type { PlanKey } from "@/lib/stripe/config";
import { PLANS } from "@/lib/stripe/config";

interface StatusBarProps {
  assistant: {
    status: string;
    ip_address?: string | null;
    created_at: string;
  } | null;
  plan: PlanKey;
}

export function StatusBar({ assistant, plan }: StatusBarProps) {
  const [uptimeStr, setUptimeStr] = useState("");

  const status = assistant?.status ?? "offline";
  const isOnline = status === "active";

  useEffect(() => {
    if (!isOnline || !assistant?.created_at) {
      setUptimeStr("");
      return;
    }
    const update = () => {
      const ms = Date.now() - new Date(assistant.created_at).getTime();
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setUptimeStr(
        d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isOnline, assistant?.created_at]);

  const statusConfig: Record<string, { label: string; dotClass: string }> = {
    active: { label: "Online", dotClass: "bg-green-500" },
    provisioning: { label: "Provisioning", dotClass: "bg-yellow-400 animate-pulse" },
    suspended: { label: "Suspended", dotClass: "bg-slate-500" },
    destroying: { label: "Destroying", dotClass: "bg-red-400 animate-pulse" },
    offline: { label: "Offline", dotClass: "bg-slate-600" },
  };

  const { label, dotClass } = statusConfig[status] ?? statusConfig.offline;
  const planInfo = PLANS[plan];

  return (
    <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-2 text-xs text-slate-400">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className={isOnline ? "text-green-400 font-medium" : ""}>{label}</span>
      </div>

      {assistant?.ip_address && isOnline && (
        <span className="font-mono text-slate-500">{assistant.ip_address}</span>
      )}

      {uptimeStr && (
        <span className="text-slate-500">up {uptimeStr}</span>
      )}

      <span className="flex-1" />

      <span
        className={`rounded-full px-2.5 py-0.5 font-medium ${
          plan === "free"
            ? "bg-slate-800 text-slate-400"
            : "bg-indigo-900/60 text-indigo-300"
        }`}
      >
        {planInfo.name}
      </span>
    </div>
  );
}
