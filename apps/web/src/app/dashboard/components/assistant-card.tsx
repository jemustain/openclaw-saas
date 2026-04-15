"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Assistant {
  id: string;
  status: string;
  ip_address?: string | null;
  provider?: string;
  region?: string;
  created_at: string;
  provisioning_step?: string | null;
  provisioning_data?: Record<string, unknown> | null;
  _provisioningError?: string | null;
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

/**
 * Map backend provisioning_step values to user-friendly labels.
 * Steps complete in order; we show all steps up to and including the current one.
 */
const PROVISION_STEP_LABELS: Record<string, string> = {
  validate: "Validating Azure account...",
  register_providers: "Registering cloud providers...",
  create_rg: "Creating resource group...",
  create_nsg: "Configuring network security...",
  create_vnet: "Setting up virtual network...",
  create_ip: "Allocating public IP address...",
  create_nic: "Creating network interface...",
  create_vm: "Creating virtual machine...",
  wait_vm: "Waiting for VM to start...",
  done: "Server provisioned - waiting for services...",
};

const PROVISION_STEP_ORDER = [
  "validate",
  "register_providers",
  "create_rg",
  "create_nsg",
  "create_vnet",
  "create_ip",
  "create_nic",
  "create_vm",
  "wait_vm",
  "done",
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Build the list of completed + current steps based on the backend provisioning_step.
 */
function buildProvisionSteps(currentStep: string | null | undefined): string[] {
  if (!currentStep) return ["Starting provisioning..."];
  const idx = PROVISION_STEP_ORDER.indexOf(currentStep);
  if (idx === -1) return ["Provisioning..."];

  const steps: string[] = [];
  for (let i = 0; i <= idx; i++) {
    const label = PROVISION_STEP_LABELS[PROVISION_STEP_ORDER[i]];
    if (label) steps.push(label);
  }
  return steps;
}

export function AssistantHero({ assistant }: { assistant: Assistant | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [current, setCurrent] = useState(assistant);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destroying, setDestroying] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [destroyElapsed, setDestroyElapsed] = useState(0);
  const [destroySteps, setDestroySteps] = useState<string[]>([]);

  const [provisioning, setProvisioning] = useState(
    assistant?.status === "provisioning"
  );
  const [provisionElapsed, setProvisionElapsed] = useState(0);
  const [provisionSteps, setProvisionSteps] = useState<string[]>(
    assistant?.status === "provisioning"
      ? buildProvisionSteps(assistant?.provisioning_step)
      : []
  );

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

  // Elapsed timer for provisioning
  useEffect(() => {
    if (!provisioning) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setProvisionElapsed(Math.floor((Date.now() - start) / 1000));
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
        } catch { /* keep polling */ }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [destroying]);

  // Poll during provisioning - uses real step data from backend
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
            setProvisionSteps((prev) => {
              const updated = buildProvisionSteps("done");
              // Deduplicate: only add steps not already shown
              const merged = [...prev];
              for (const s of updated) {
                if (!merged.includes(s)) merged.push(s);
              }
              if (!merged.includes("Your assistant is online!")) {
                merged.push("Your assistant is online!");
              }
              return merged;
            });
            router.refresh();
            return;
          }
          if (a?.status === "destroyed" || a?.status === "destroying") {
            setCurrent(null);
            setProvisioning(false);
            setProvisionSteps((prev) => [...prev, "Provisioning failed"]);
            setError("Provisioning failed. Please try again.");
            return;
          }
          // Update steps based on real provisioning_step
          if (a?.provisioning_step) {
            setProvisionSteps(buildProvisionSteps(a.provisioning_step));
          }
          // Surface provisioning errors
          if (a?._provisioningError) {
            setError(a._provisioningError);
          }
        } catch { /* keep polling */ }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [provisioning, router]);

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
        // Update steps from the initial response
        if (data.assistant?.provisioning_step) {
          setProvisionSteps(buildProvisionSteps(data.assistant.provisioning_step));
        }
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
    setLoading("/api/assistant/resume");
    setError(null);
    setResuming(true);
    try {
      const res = await fetch("/api/assistant/resume", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Resume failed");
        setResuming(false);
        return;
      }
      // Poll for active status — az vm start is async
      const maxWait = 60_000;
      const interval = 3_000;
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, interval));
        const poll = await fetch("/api/assistant/status");
        const pollData = await poll.json();
        if (pollData.assistant?.status === "active") {
          setCurrent(pollData.assistant);
          setResuming(false);
          return;
        }
      }
      // Timed out — show whatever we have
      const final = await fetch("/api/assistant/status");
      const finalData = await final.json();
      setCurrent(finalData.assistant ?? null);
      setResuming(false);
    } catch {
      setError("Network error - please try again");
      setResuming(false);
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

  function uptime() {
    if (!current?.created_at || status !== "active") return null;
    const ms = Date.now() - new Date(current.created_at).getTime();
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  }

  const statusConfig: Record<string, { label: string; dot: string; border: string }> = {
    active: { label: "Online", dot: "bg-green-500", border: "from-violet-500 to-purple-600" },
    provisioning: { label: "Provisioning", dot: "bg-yellow-400 animate-pulse", border: "from-yellow-400 to-amber-500" },
    suspended: { label: "Suspended", dot: "bg-gray-500", border: "from-slate-600 to-slate-700" },
    destroying: { label: "Destroying", dot: "bg-red-400 animate-pulse", border: "from-red-500 to-rose-600" },
    offline: { label: "No Assistant", dot: "bg-gray-600", border: "from-slate-700 to-slate-800" },
  };

  const effectiveStatus = destroying ? "destroying" : provisioning ? "provisioning" : status;
  const { label, dot, border } = statusConfig[effectiveStatus] ?? statusConfig.offline;

  // Progress steps UI (shared between provisioning and destroying)
  const isProgress = destroying || provisioning || status === "provisioning";
  const progressSteps = destroying ? destroySteps : provisionSteps;
  const progressElapsed = destroying ? destroyElapsed : provisionElapsed;
  const progressHint = destroying ? "Typically takes 30-60 seconds" : "Typically takes 5-10 minutes";

  // Calculate progress percentage for provisioning
  const currentStepIdx = current?.provisioning_step
    ? PROVISION_STEP_ORDER.indexOf(current.provisioning_step)
    : -1;
  const progressPct = provisioning && currentStepIdx >= 0
    ? Math.round(((currentStepIdx + 1) / PROVISION_STEP_ORDER.length) * 100)
    : 0;

  return (
    <div className={`relative rounded-2xl bg-gradient-to-r ${border} p-[1px]`}>
      <div className="rounded-2xl bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: status info */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3">
              <span className={`h-4 w-4 rounded-full ${dot} ring-4 ring-slate-900`} />
              <h2 className="text-2xl font-bold text-white">{label}</h2>
            </div>

            {current?.provider && (
              <p className="text-sm text-slate-400">
                {providerLabel(current.provider)}
                {current.region && <span className="text-slate-500"> · {current.region}</span>}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              {current?.ip_address && status === "active" && (
                <span>
                  IP: <span className="font-mono text-slate-200">{current.ip_address}</span>
                </span>
              )}
              {uptime() && (
                <span>
                  Uptime: <span className="text-slate-200">{uptime()}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          {!isProgress && (
            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
              {status === "active" && (
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
                  disabled={!!loading || resuming}
                  onClick={handleResume}
                  className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {resuming ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Resuming…
                    </span>
                  ) : "Resume"}
                </button>
              )}

              {current && status !== "destroying" && !confirmDestroy && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title="More options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/></svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-slate-800 border border-slate-700 shadow-lg z-10">
                      <button
                        onClick={() => { setShowMenu(false); setConfirmDestroy(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Destroy server
                      </button>
                    </div>
                  )}
                </div>
              )}

              {confirmDestroy && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Are you sure?</span>
                  <button
                    disabled={!!loading}
                    onClick={handleDestroy}
                    className="rounded-full bg-red-700 px-4 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Yes, destroy
                  </button>
                  <button
                    onClick={() => setConfirmDestroy(false)}
                    className="rounded-full bg-slate-800 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {(!current || status === "offline") && !confirmDestroy && (
                <button
                  disabled={!!loading}
                  onClick={handleLaunch}
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {loading === "/api/assistant/launch" ? "Launching…" : "Launch Assistant"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress steps (provisioning / destroying) */}
        {isProgress && (
          <div className="mt-6 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500">{progressHint}</p>
                {provisioning && progressPct > 0 && (
                  <span className="text-xs font-medium text-violet-400">{progressPct}%</span>
                )}
              </div>
              <span className="text-sm text-slate-500 font-mono">{formatTime(progressElapsed)}</span>
            </div>

            {/* Progress bar for provisioning */}
            {provisioning && progressPct > 0 && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="space-y-2">
              {progressSteps.map((step, i) => {
                const isLast = i === progressSteps.length - 1;
                const isDone = step.startsWith("Done") || step.includes("online");
                const isFailed = step.includes("failed");
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {isDone || isFailed ? (
                      <span className={`w-4 h-4 flex-shrink-0 ${isFailed ? "text-red-400" : "text-green-400"}`}>
                        {isFailed ? "✕" : "✓"}
                      </span>
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
          <p className="text-sm text-red-400 mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
