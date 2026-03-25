"use client";

import { useState } from "react";

interface Assistant {
  id: string;
  status: string;
  ip_address?: string | null;
  provider?: string;
  region?: string;
  created_at: string;
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    oracle: "Oracle Cloud",
    azure: "Microsoft Azure",
    digitalocean: "DigitalOcean",
  };
  return labels[provider] ?? provider;
}

export function AssistantCard({ assistant }: { assistant: Assistant | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [current, setCurrent] = useState(assistant);
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  const status = current?.status ?? "offline";

  const statusConfig: Record<string, { label: string; dot: string }> = {
    active: { label: "Online", dot: "bg-green-500" },
    provisioning: { label: "Provisioning", dot: "bg-yellow-400 animate-pulse" },
    suspended: { label: "Suspended", dot: "bg-gray-500" },
    offline: { label: "No Assistant", dot: "bg-gray-600" },
  };

  const { label, dot } = statusConfig[status] ?? statusConfig.offline;

  const [error, setError] = useState<string | null>(null);

  async function act(endpoint: string, method = "POST") {
    setLoading(endpoint);
    setError(null);
    try {
      const res = await fetch(endpoint, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Action failed (${res.status})`);
        return;
      }
      const refreshed = await fetch("/api/assistant/status");
      const data = await refreshed.json();
      setCurrent(data.assistant ?? null);
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
      setConfirmDestroy(false);
    }
  }

  function uptime() {
    if (!current?.created_at || status !== "active") return null;
    const ms = Date.now() - new Date(current.created_at).getTime();
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Your Assistant</h2>

      <div className="flex items-center gap-2 mb-4">
        <span className={`h-3 w-3 rounded-full ${dot}`} />
        <span className="text-slate-100">{label}</span>
      </div>

      {current?.provider && (
        <p className="text-sm text-slate-400 mb-2">
          Running on{" "}
          <span className="text-slate-200">
            {providerLabel(current.provider)}
          </span>
        </p>
      )}

      {current?.ip_address && status === "active" && (
        <p className="text-sm text-slate-400 mb-2">
          Your assistant&apos;s address:{" "}
          <span className="text-slate-200 font-mono">{current.ip_address}</span>
        </p>
      )}

      {uptime() && (
        <p className="text-sm text-slate-400 mb-4">
          Uptime: <span className="text-slate-200">{uptime()}</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        {status === "active" && (
          <button
            disabled={!!loading}
            onClick={() => act("/api/assistant/suspend")}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {loading === "/api/assistant/suspend" ? "Suspending…" : "Suspend"}
          </button>
        )}

        {status === "suspended" && (
          <button
            disabled={!!loading}
            onClick={() => act("/api/assistant/launch")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading === "/api/assistant/launch" ? "Resuming…" : "Resume"}
          </button>
        )}

        {current && status !== "offline" && !confirmDestroy && (
          <button
            onClick={() => setConfirmDestroy(true)}
            className="rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300 hover:bg-red-900 disabled:opacity-50"
          >
            Destroy
          </button>
        )}

        {confirmDestroy && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400">Are you sure?</span>
            <button
              disabled={!!loading}
              onClick={() => act("/api/assistant/destroy")}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
            >
              {loading === "/api/assistant/destroy" ? "Destroying…" : "Yes, destroy"}
            </button>
            <button
              onClick={() => setConfirmDestroy(false)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        )}

        {status === "offline" && (
          <button
            disabled={!!loading}
            onClick={() => act("/api/assistant/launch")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading === "/api/assistant/launch" ? "Launching…" : "Launch Assistant"}
          </button>
        )}
      </div>
    </div>
  );
}
