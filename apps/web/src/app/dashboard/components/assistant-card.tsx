"use client";

import { useState, useEffect, useCallback } from "react";

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

type DestroyPhase = "stopping" | "deleting-resources" | "cleaning-up" | "done";

const DESTROY_STEPS: { phase: DestroyPhase; label: string; atSec: number }[] = [
  { phase: "stopping", label: "Stopping services...", atSec: 0 },
  { phase: "deleting-resources", label: "Deleting cloud resources...", atSec: 5 },
  { phase: "cleaning-up", label: "Cleaning up...", atSec: 20 },
  { phase: "done", label: "Destroyed", atSec: 0 },
];

type ProvisionPhase = "creating" | "installing" | "configuring" | "starting" | "done";

const PROVISION_STEPS: { phase: ProvisionPhase; label: string; atSec: number }[] = [
  { phase: "creating", label: "Creating server...", atSec: 0 },
  { phase: "installing", label: "Installing OpenClaw and dependencies...", atSec: 20 },
  { phase: "configuring", label: "Configuring your assistant...", atSec: 60 },
  { phase: "starting", label: "Starting services...", atSec: 120 },
  { phase: "done", label: "Online", atSec: 0 },
];

export function AssistantCard({ assistant }: { assistant: Assistant | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [current, setCurrent] = useState(assistant);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Destroy progress state
  const [destroying, setDestroying] = useState(false);
  const [destroyElapsed, setDestroyElapsed] = useState(0);
  const [destroySteps, setDestroySteps] = useState<string[]>([]);

  // Provision progress state
  const [provisioning, setProvisioning] = useState(
    assistant?.status === "provisioning"
  );
  const [provisionElapsed, setProvisionElapsed] = useState(0);
  const [provisionSteps, setProvisionSteps] = useState<string[]>([]);

  const status = current?.status ?? "offline";

  // Timer for destroy
  useEffect(() => {
    if (!destroying) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setDestroyElapsed(elapsed);

      // Add milestone messages
      for (const step of DESTROY_STEPS) {
        if (step.phase !== "done" && elapsed >= step.atSec) {
          setDestroySteps((prev) =>
            prev.includes(step.label) ? prev : [...prev, step.label]
          );
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [destroying]);

  // Timer for provisioning
  useEffect(() => {
    if (!provisioning) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setProvisionElapsed(elapsed);

      for (const step of PROVISION_STEPS) {
        if (step.phase !== "done" && elapsed >= step.atSec) {
          setProvisionSteps((prev) =>
            prev.includes(step.label) ? prev : [...prev, step.label]
          );
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [provisioning]);

  // Poll during destroy
  useEffect(() => {
    if (!destroying) return;
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
        try {
          const res = await fetch("/api/assistant/status");
          const data = await res.json();
          const a = data.assistant;
          if (!a || a.status === "destroyed") {
            setCurrent(null);
            setDestroying(false);
            setDestroySteps((prev) => [...prev, "Done - assistant destroyed"]);
            return;
          }
          if (a.status === "destroying") {
            // Still in progress
            continue;
          }
          // Unexpected state
          setCurrent(a);
          setDestroying(false);
          return;
        } catch {
          // Network error, keep polling
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [destroying]);

  // Poll during provisioning
  useEffect(() => {
    if (!provisioning) return;
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 5000));
        if (cancelled) return;
        try {
          const res = await fetch("/api/assistant/status");
          const data = await res.json();
          const a = data.assistant;
          if (a?.status === "active") {
            setCurrent(a);
            setProvisioning(false);
            setProvisionSteps((prev) => [...prev, "Your assistant is online!"]);
            return;
          }
          if (a?.status === "destroyed" || a?.status === "destroying") {
            setCurrent(null);
            setProvisioning(false);
            setProvisionSteps((prev) => [...prev, "Provisioning failed"]);
            setError("Provisioning failed. Please try again.");
            return;
          }
        } catch {
          // Keep polling
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [provisioning]);

  async function handleDestroy() {
    setLoading("/api/assistant/destroy");
    setError(null);
    setDestroying(true);
    setDestroyElapsed(0);
    setDestroySteps(["Initiating shutdown..."]);
    setConfirmDestroy(false);

    try {
      const res = await fetch("/api/assistant/destroy", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Destroy failed");
        setDestroying(false);
        setDestroySteps([]);
      }
    } catch {
      setError("Network error - please try again");
      setDestroying(false);
      setDestroySteps([]);
    } finally {
      setLoading(null);
    }
  }

  async function handleLaunch() {
    setLoading("/api/assistant/launch");
    setError(null);
    setProvisioning(true);
    setProvisionElapsed(0);
    setProvisionSteps(["Starting provisioning..."]);

    try {
      const res = await fetch("/api/assistant/launch", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Launch failed");
        setProvisioning(false);
        setProvisionSteps([]);
      } else {
        const data = await res.json();
        setCurrent(data.assistant ?? current);
      }
    } catch {
      setError("Network error - please try again");
      setProvisioning(false);
      setProvisionSteps([]);
    } finally {
      setLoading(null);
    }
  }

  async function handleResume() {
    setLoading("/api/assistant/launch");
    setError(null);
    try {
      const res = await fetch("/api/assistant/launch", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Resume failed");
        return;
      }
      const refreshed = await fetch("/api/assistant/status");
      const data = await refreshed.json();
      setCurrent(data.assistant ?? null);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(null);
    }
  }

  async function handleSuspend() {
    setLoading("/api/assistant/suspend");
    setError(null);
    try {
      const res = await fetch("/api/assistant/suspend", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Suspend failed");
        return;
      }
      const refreshed = await fetch("/api/assistant/status");
      const data = await refreshed.json();
      setCurrent(data.assistant ?? null);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(null);
    }
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function uptime() {
    if (!current?.created_at || status !== "active") return null;
    const ms = Date.now() - new Date(current.created_at).getTime();
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  }

  const statusConfig: Record<string, { label: string; dot: string }> = {
    active: { label: "Online", dot: "bg-green-500" },
    provisioning: { label: "Provisioning", dot: "bg-yellow-400 animate-pulse" },
    suspended: { label: "Suspended", dot: "bg-gray-500" },
    destroying: { label: "Destroying", dot: "bg-red-400 animate-pulse" },
    offline: { label: "No Assistant", dot: "bg-gray-600" },
  };

  const effectiveStatus = destroying ? "destroying" : provisioning ? "provisioning" : status;
  const { label, dot } = statusConfig[effectiveStatus] ?? statusConfig.offline;

  // Destroying state - show progress
  if (destroying) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800/80 p-6 transition-all duration-200 hover:scale-[1.01] hover:border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Your Assistant</h2>

        <div className="flex items-center gap-2 mb-4">
          <span className={`h-3 w-3 rounded-full ${dot}`} />
          <span className="text-slate-100">{label}</span>
          <span className="text-sm text-slate-500 ml-auto">{formatTime(destroyElapsed)}</span>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Typically takes 30-60 seconds
        </p>

        <div className="space-y-2">
          {destroySteps.map((step, i) => {
            const isLast = i === destroySteps.length - 1;
            const isDone = step.startsWith("Done");
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {isDone ? (
                  <span className="w-4 h-4 text-green-400 flex-shrink-0">&#10003;</span>
                ) : isLast ? (
                  <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 text-green-400 flex-shrink-0">&#10003;</span>
                )}
                <span className={isLast && !isDone ? "text-white font-medium" : "text-slate-400"}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Provisioning state - show progress
  if (provisioning || status === "provisioning") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800/80 p-6 transition-all duration-200 hover:scale-[1.01] hover:border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Your Assistant</h2>

        <div className="flex items-center gap-2 mb-4">
          <span className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-slate-100">Provisioning</span>
          <span className="text-sm text-slate-500 ml-auto">{formatTime(provisionElapsed)}</span>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Typically takes 2-4 minutes
        </p>

        <div className="space-y-2">
          {provisionSteps.map((step, i) => {
            const isLast = i === provisionSteps.length - 1;
            const isDone = step.includes("online") || step.includes("failed");
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {isDone ? (
                  <span className={`w-4 h-4 flex-shrink-0 ${step.includes("failed") ? "text-red-400" : "text-green-400"}`}>
                    {step.includes("failed") ? "✕" : "&#10003;"}
                  </span>
                ) : isLast ? (
                  <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 text-green-400 flex-shrink-0">&#10003;</span>
                )}
                <span className={isLast && !isDone ? "text-white font-medium" : "text-slate-400"}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-red-400 mt-3">{error}</p>
        )}
      </div>
    );
  }

  // Normal states
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800/80 p-6 transition-all duration-200 hover:scale-[1.01] hover:border-slate-700">
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
          Address:{" "}
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
            onClick={handleSuspend}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {loading === "/api/assistant/suspend" ? "Suspending..." : "Suspend"}
          </button>
        )}

        {status === "suspended" && (
          <button
            disabled={!!loading}
            onClick={handleResume}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading === "/api/assistant/launch" ? "Resuming..." : "Resume"}
          </button>
        )}

        {current && status !== "destroying" && !confirmDestroy && (
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
              onClick={handleDestroy}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
            >
              Yes, destroy
            </button>
            <button
              onClick={() => setConfirmDestroy(false)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        )}

        {(!current || status === "offline") && !confirmDestroy && (
          <button
            disabled={!!loading}
            onClick={handleLaunch}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading === "/api/assistant/launch" ? "Launching..." : "Launch Assistant"}
          </button>
        )}
      </div>
    </div>
  );
}
