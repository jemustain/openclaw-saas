"use client";

import { useEffect, useState, useCallback } from "react";

interface UsageData {
  messages_today: number;
  messages_limit: number | null;
  hours_active: number;
  hours_limit: number;
  plan: string;
}

function ProgressBar({
  value,
  max,
  unlimited,
}: {
  value: number;
  max: number | null;
  unlimited?: boolean;
}) {
  if (unlimited || max === null) return null;
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct >= 100
      ? "bg-red-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-indigo-500";

  return (
    <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function UsageCard() {
  const [data, setData] = useState<UsageData>({
    messages_today: 0,
    messages_limit: 50,
    hours_active: 0,
    hours_limit: 8,
    plan: "free",
  });

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/today");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  const { messages_today, messages_limit, hours_active, hours_limit, plan } =
    data;
  const isUnlimitedMessages = messages_limit === null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Today&apos;s Usage
      </h2>

      {/* Messages */}
      <div className="mb-4">
        <p className="text-sm text-slate-400 mb-1">Messages today</p>
        <p className="text-slate-100 text-2xl font-bold">
          {messages_today}{" "}
          <span className="text-base font-normal text-slate-500">
            {isUnlimitedMessages ? "unlimited" : `/ ${messages_limit}`}
          </span>
        </p>
        <ProgressBar
          value={messages_today}
          max={messages_limit}
          unlimited={isUnlimitedMessages}
        />
        {!isUnlimitedMessages && (
          <p className="text-xs text-slate-500 mt-1">
            {messages_today >= messages_limit!
              ? "Daily message limit reached"
              : `${messages_limit! - messages_today} messages remaining`}
          </p>
        )}
      </div>

      {/* Hours */}
      <div className="mb-4">
        <p className="text-sm text-slate-400 mb-1">Hours active today</p>
        <p className="text-slate-100 text-2xl font-bold">
          {hours_active.toFixed(1)}
          <span className="text-base font-normal text-slate-500">
            {" "}
            / {hours_limit}h
          </span>
        </p>
        <ProgressBar value={hours_active} max={hours_limit} />
        {hours_active >= hours_limit && (
          <p className="text-xs text-red-400 mt-1">
            Daily hours limit reached
          </p>
        )}
      </div>

      <p className="text-xs text-indigo-400 capitalize">{plan} plan</p>
    </div>
  );
}
