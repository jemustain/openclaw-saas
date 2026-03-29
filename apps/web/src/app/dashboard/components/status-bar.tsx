"use client";

import { useState, useEffect } from "react";

interface StatusBarProps {
  status: string;
  ipAddress?: string | null;
  createdAt?: string | null;
  plan: string;
}

function useUptime(createdAt: string | null | undefined, isActive: boolean) {
  const [uptime, setUptime] = useState("");

  useEffect(() => {
    if (!createdAt || !isActive) {
      setUptime("");
      return;
    }
    const tick = () => {
      const ms = Date.now() - new Date(createdAt).getTime();
      if (ms < 0) { setUptime("0s"); return; }
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      const parts: string[] = [];
      if (d) parts.push(`${d}d`);
      if (h) parts.push(`${h}h`);
      if (m) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setUptime(parts.join(" "));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, isActive]);

  return uptime;
}

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  active: { label: "Online", dot: "bg-green-500 shadow-green-500/50 shadow-sm" },
  provisioning: { label: "Provisioning", dot: "bg-yellow-400 animate-pulse" },
  suspended: { label: "Suspended", dot: "bg-slate-500" },
  destroying: { label: "Destroying", dot: "bg-red-400 animate-pulse" },
  offline: { label: "Offline", dot: "bg-slate-600" },
};

export function StatusBar({ status, ipAddress, createdAt, plan }: StatusBarProps) {
  const effective = status || "offline";
  const { label, dot } = STATUS_MAP[effective] ?? STATUS_MAP.offline;
  const uptime = useUptime(createdAt, effective === "active");

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 px-4 py-2 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className="font-medium text-slate-100">{label}</span>

      {ipAddress && effective === "active" && (
        <span className="text-slate-500 font-mono text-xs">{ipAddress}</span>
      )}

      {uptime && (
        <span className="text-slate-500 font-mono text-xs tabular-nums">
          {uptime}
        </span>
      )}

      <span className="ml-auto rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 capitalize">
        {plan}
      </span>
    </div>
  );
}
