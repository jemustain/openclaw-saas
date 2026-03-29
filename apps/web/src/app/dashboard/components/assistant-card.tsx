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

function borderClassForStatus(status: string): string {
  switch (status) {
    case "active":
      return "border-transparent bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-violet-500/20";
    case "destroying":
      return "border-transparent bg-gradient-to-r from-red-500/30 via-red-600/20 to-red-500/30 animate-pulse";
    case "provisioning":
      return "border-transparent bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 animate-pulse";
    default:
      return "border-slate-800";
  }
}

export function AssistantHero({ assistant }: { assistant: Assistant | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [current, setCurrent] = useState(assistant);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destroying, setDestroying] = useState(false);
  const [destroyElapsed, setDestroyElapsed] = useState(0);
  const [destroySteps, setDestroySteps] = useState<string[]>([]);

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
          if (a.status === "destroying") continue;
          setCurrent(a);
          setDestroying(false);
          return;
        } catch {}
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
        } catch {}
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
  const { label: statusLabel, dot } = statusConfig[effectiveStatus] ?? statusConfig.offline;

  const showProgress = destroying || provisioning || status === "provisioning";
  const progressSteps = destroying ? destroySteps : provisionSteps;
  const progressElapsed = destroying ? destroyElapsed : provisionElapsed;
  const progressHint = destroying ? "Typically takes 30-60 seconds" : "Typically takes 2-4 minutes";

  const providerLine = current?.provider
    ? `Running on ${providerLabel(current.provider)}${current.region ? ` · ${current.region}` : ""}`
    : null;

  return (
    <div className={`rounded-2xl border-2 ${borderClassForStatus(effectiveStatus)} bg-slate-900 p-6 sm:p-8 mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: Status info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`h-4 w-4 rounded-full ${dot} flex-shrink-0`} />
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              Your Assistant
            </h1>
            <span className="text-sm font-medium text-slate-400 bg-slate-800 rounded-full px-3 py-0.5">
              {statusLabel}
            </span>
          </div>

          {providerLine && (
            <p className="text-sm text-slate-500 ml-7 mb-1">{providerLine}</p>
          )}

          {current?.ip_address && status === "active" && (
            <p className="text-sm text-slate-400 ml-7">
              <span className="font-mono text-slate-300">{current.ip_address}</span>
              {uptime() && (
                <span className="text-slate-600 mx-2">·</span>
              )}
              {uptime() && (
                <span className="text-slate-500">Uptime {uptime()}</span>
              )}
            </p>
          )}

          {/* Progress steps (provisioning/destroying) */}
          {showProgress && (
            <div className="mt-4 ml-7">
              <p className="text-xs text-slate-500 mb-2">
                {progressHint} — {formatTime(progressElapsed)}
              </p>
              <div className="space-y-1.5">
                {progressSteps.map((step, i) => {
                  const isLast = i === progressSteps.length - 1;
                  const isDone = step.startsWith("Done") || step.includes("online");
                  const isFailed = step.includes("failed");
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {isDone ? (
                        <span className="w-4 h-4 text-green-400 flex-shrink-0">✓</span>
                      ) : isFailed ? (
                        <span className="w-4 h-4 text-red-400 flex-shrink-0">✕</span>
                      ) : isLast ? (
                        <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <span className="w-4 h-4 text-green-400 flex-shrink-0">✓</span>
                      )}
                      <span className={isLast && !isDone && !isFailed ? "text-white font-medium" : "text-slate-400"}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 mt-3 ml-7">{error}</p>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          {status === "active" && !destroying && (
            <button
              disabled={!!loading}
              onClick={handleSuspend}
              className="rounded-full bg-slate-800 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading === "/api/assistant/suspend" ? "Suspending…" : "Suspend"}
            </button>
          )}

          {status === "suspended" && (
            <button
              disabled={!!loading}
              onClick={handleResume}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading === "/api/assistant/launch" ? "Resuming…" : "Resume"}
            </button>
          )}

          {current && status !== "destroying" && !destroying && !confirmDestroy && (
            <button
              onClick={() => setConfirmDestroy(true)}
              className="rounded-full bg-red-900/40 px-5 py-2 text-sm font-medium text-red-300 hover:bg-red-900/70 transition-colors"
            >
              Destroy
            </button>
          )}

          {confirmDestroy && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-400">Sure?</span>
              <button
                disabled={!!loading}
                onClick={handleDestroy}
                className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                Yes, destroy
              </button>
              <button
                onClick={() => setConfirmDestroy(false)}
                className="rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {(!current || status === "offline") && !confirmDestroy && !provisioning && (
            <button
              disabled={!!loading}
              onClick={handleLaunch}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading === "/api/assistant/launch" ? "Launching…" : "Launch Assistant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep backward compat export
export { AssistantHero as AssistantCard };
