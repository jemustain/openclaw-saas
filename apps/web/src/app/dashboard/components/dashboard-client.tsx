"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessengerSetupModal } from "./messenger-setup-modal";
import type { PlanKey } from "@/lib/stripe/config";

/* ── Types ── */

interface Assistant {
  id: string;
  status: string;
  ip_address?: string | null;
  provider?: string;
  region?: string;
  created_at: string;
}

interface MessengerStatus {
  messenger: string;
  connected: boolean;
  configured: boolean;
  botLink?: string | null;
}

interface UsageData {
  messagesUsed: number;
  hoursActive: number;
  plan: string;
  limit: number | null;
}

interface DashboardClientProps {
  assistant: Assistant | null;
  plan: PlanKey;
  hosting?: string;
  providerConnected: boolean;
  messengers: string[];
  aiProvider: string | null;
  aiApiKey: string | null;
}

/* ── Constants ── */

const PROVIDER_LABELS: Record<string, string> = {
  oracle: "Oracle",
  azure: "Azure",
  digitalocean: "DigitalOcean",
};

const AI_LABELS: Record<string, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  "github-copilot": "GitHub Copilot",
};

const MESSENGER_LABELS: Record<string, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  discord: "Discord",
  slack: "Slack",
  signal: "Signal",
};

type ProgressPhase = string;
interface ProgressStep { phase: ProgressPhase; label: string; atSec: number }

const PROVISION_STEPS: ProgressStep[] = [
  { phase: "creating", label: "Creating server…", atSec: 0 },
  { phase: "installing", label: "Installing dependencies…", atSec: 20 },
  { phase: "configuring", label: "Configuring assistant…", atSec: 60 },
  { phase: "starting", label: "Starting services…", atSec: 120 },
];

const DESTROY_STEPS: ProgressStep[] = [
  { phase: "stopping", label: "Stopping services…", atSec: 0 },
  { phase: "deleting", label: "Deleting resources…", atSec: 5 },
  { phase: "cleaning", label: "Cleaning up…", atSec: 20 },
];

/* ── Component ── */

export function DashboardClient({
  assistant: initialAssistant,
  plan,
  hosting,
  providerConnected,
  messengers,
  aiProvider,
  aiApiKey,
}: DashboardClientProps) {
  const [assistant, setAssistant] = useState(initialAssistant);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  // Progress
  const [provisioning, setProvisioning] = useState(initialAssistant?.status === "provisioning");
  const [destroying, setDestroying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState<string[]>([]);

  // Messenger
  const [messengerStatuses, setMessengerStatuses] = useState<MessengerStatus[]>([]);
  const [setupModal, setSetupModal] = useState<string | null>(null);

  // Usage
  const [usage, setUsage] = useState<UsageData>({ messagesUsed: 0, hoursActive: 0, plan: "free", limit: 100 });

  // Upgrade
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const status = assistant?.status ?? "offline";
  const isActive = status === "active";
  const isBusy = provisioning || destroying;

  /* ── Fetch helpers ── */

  const fetchMessengerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging/status");
      if (!res.ok) return;
      const data = await res.json();
      const platforms = data.platforms ?? {};
      setMessengerStatuses(
        Object.entries(platforms).map(([key, val]: [string, any]) => ({
          messenger: key,
          connected: val.connected ?? false,
          configured: val.configured ?? false,
          botLink: val.botLink ?? null,
        }))
      );
    } catch { /* silent */ }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/today");
      if (res.ok) setUsage(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUsage();
    if (messengers.length > 0) fetchMessengerStatus();
    const i1 = setInterval(fetchUsage, 60_000);
    const i2 = messengers.length > 0 ? setInterval(fetchMessengerStatus, 30_000) : null;
    return () => { clearInterval(i1); if (i2) clearInterval(i2); };
  }, [fetchUsage, fetchMessengerStatus, messengers.length]);

  /* ── Progress timer ── */

  useEffect(() => {
    if (!isBusy) return;
    const start = Date.now();
    const stepsConfig = provisioning ? PROVISION_STEPS : DESTROY_STEPS;
    const interval = setInterval(() => {
      const e = Math.floor((Date.now() - start) / 1000);
      setElapsed(e);
      for (const step of stepsConfig) {
        if (e >= step.atSec) {
          setSteps(prev => prev.includes(step.label) ? prev : [...prev, step.label]);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isBusy, provisioning]);

  /* ── Poll during progress ── */

  useEffect(() => {
    if (!isBusy) return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await new Promise(r => setTimeout(r, provisioning ? 5000 : 3000));
        if (cancelled) return;
        try {
          const res = await fetch("/api/assistant/status");
          const data = await res.json();
          const a = data.assistant;
          if (destroying && (!a || a.status === "destroyed")) {
            setAssistant(null); setDestroying(false); setSteps([]); return;
          }
          if (provisioning && a?.status === "active") {
            setAssistant(a); setProvisioning(false); setSteps([]); return;
          }
          if (provisioning && (a?.status === "destroyed" || a?.status === "destroying")) {
            setAssistant(null); setProvisioning(false); setSteps([]);
            setError("Provisioning failed."); return;
          }
        } catch { /* keep polling */ }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [isBusy, provisioning, destroying]);

  /* ── Actions ── */

  async function handleLaunch() {
    setLoading("launch"); setError(null);
    setProvisioning(true); setElapsed(0); setSteps(["Starting provisioning…"]);
    try {
      const res = await fetch("/api/assistant/launch", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Launch failed"); setProvisioning(false); setSteps([]);
      } else {
        const d = await res.json();
        if (d.assistant) setAssistant(d.assistant);
      }
    } catch { setError("Network error"); setProvisioning(false); setSteps([]); }
    finally { setLoading(null); }
  }

  async function handleSuspend() {
    setLoading("suspend"); setError(null);
    try {
      const res = await fetch("/api/assistant/suspend", { method: "POST" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Suspend failed"); return; }
      const r2 = await fetch("/api/assistant/status");
      const d2 = await r2.json();
      setAssistant(d2.assistant ?? null);
    } catch { setError("Network error"); }
    finally { setLoading(null); }
  }

  async function handleResume() {
    setLoading("resume"); setError(null);
    try {
      const res = await fetch("/api/assistant/launch", { method: "POST" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Resume failed"); return; }
      const r2 = await fetch("/api/assistant/status");
      const d2 = await r2.json();
      setAssistant(d2.assistant ?? null);
    } catch { setError("Network error"); }
    finally { setLoading(null); }
  }

  async function handleDestroy() {
    setLoading("destroy"); setError(null); setConfirmDestroy(false);
    setDestroying(true); setElapsed(0); setSteps(["Initiating shutdown…"]);
    try {
      const res = await fetch("/api/assistant/destroy", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Destroy failed"); setDestroying(false); setSteps([]);
      }
    } catch { setError("Network error"); setDestroying(false); setSteps([]); }
    finally { setLoading(null); }
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else setUpgradeLoading(false);
    } catch { setUpgradeLoading(false); }
  }

  /* ── Helpers ── */

  function uptime(): string | null {
    if (!assistant?.created_at || !isActive) return null;
    const ms = Date.now() - new Date(assistant.created_at).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const providerLabel = hosting ? PROVIDER_LABELS[hosting] ?? hosting : null;
  const aiLabel = aiProvider ? AI_LABELS[aiProvider] ?? aiProvider : null;
  const aiConfigured = !!aiProvider && !!aiApiKey;
  const providerActive = hosting === "oracle" || providerConnected;
  const messengerStatus = (m: string) => messengerStatuses.find(s => s.messenger === m);

  const msgLimit = usage.limit;
  const msgPct = msgLimit ? Math.min((usage.messagesUsed / msgLimit) * 100, 100) : 0;
  const hoursPct = Math.min((usage.hoursActive / 8) * 100, 100);

  /* ── Progress view ── */

  if (isBusy) {
    const label = provisioning ? "Provisioning" : "Destroying";
    const note = provisioning ? "Typically 2–4 minutes" : "Typically 30–60 seconds";
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xl font-medium text-white">{label}</span>
            <span className="text-sm text-slate-500 ml-auto">{formatTime(elapsed)}</span>
          </div>
          <p className="text-sm text-slate-500 mb-8">{note}</p>
          <div className="space-y-3">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {isLast ? (
                    <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <span className="text-green-400 flex-shrink-0">✓</span>
                  )}
                  <span className={isLast ? "text-white font-medium" : "text-slate-500"}>{step}</span>
                </div>
              );
            })}
          </div>
          {error && <p className="text-sm text-red-400 mt-6">{error}</p>}
        </div>
      </div>
    );
  }

  /* ── Main dashboard ── */

  const statusDot = isActive ? "bg-green-500" : status === "suspended" ? "bg-slate-500" : "bg-slate-600";
  const statusText = isActive
    ? "Your assistant is online"
    : status === "suspended"
      ? "Your assistant is suspended"
      : "No assistant running";

  const metaParts: string[] = [];
  if (providerLabel && assistant) metaParts.push(providerLabel);
  if (assistant?.region) metaParts.push(assistant.region);
  if (assistant?.ip_address && isActive) metaParts.push(assistant.ip_address);
  if (uptime()) metaParts.push(uptime()!);

  return (
    <>
      <div className="min-h-screen bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
              <h1 className="text-xl font-medium text-white">{statusText}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 text-sm">
              {isActive && (
                <button
                  onClick={handleSuspend}
                  disabled={!!loading}
                  className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loading === "suspend" ? "Suspending…" : "Suspend"}
                </button>
              )}
              {status === "suspended" && (
                <button
                  onClick={handleResume}
                  disabled={!!loading}
                  className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loading === "resume" ? "Resuming…" : "Resume"}
                </button>
              )}
              {assistant && !confirmDestroy && (
                <button
                  onClick={() => setConfirmDestroy(true)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Destroy
                </button>
              )}
              {confirmDestroy && (
                <span className="flex items-center gap-2">
                  <span className="text-red-400">Sure?</span>
                  <button onClick={handleDestroy} disabled={!!loading} className="text-red-300 hover:text-red-200 font-medium disabled:opacity-50">Yes</button>
                  <button onClick={() => setConfirmDestroy(false)} className="text-slate-500 hover:text-slate-300">Cancel</button>
                </span>
              )}
              {!assistant && (
                <button
                  onClick={handleLaunch}
                  disabled={!!loading}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-50"
                >
                  {loading === "launch" ? "Launching…" : "Launch"}
                </button>
              )}
            </div>
          </div>

          {/* Metadata line */}
          {metaParts.length > 0 && (
            <p className="text-sm text-slate-500 mt-1 mb-10 ml-[22px]">
              {metaParts.join(" · ")}
            </p>
          )}
          {metaParts.length === 0 && <div className="mb-10" />}

          {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

          {/* ── Two columns ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Left: Setup */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Setup</h2>
              <div className="space-y-0">
                {/* Cloud provider */}
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <span className="text-sm text-slate-300">Cloud provider</span>
                  {hosting && providerActive ? (
                    <span className="text-sm"><span className="text-green-400">✓</span> <span className="text-slate-300">{providerLabel}</span></span>
                  ) : hosting ? (
                    <a href={`/api/auth/${hosting}`} className="text-sm text-indigo-400 hover:text-indigo-300">Connect</a>
                  ) : (
                    <span className="text-sm text-slate-500">○ Not connected</span>
                  )}
                </div>

                {/* AI Model */}
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <span className="text-sm text-slate-300">AI Model</span>
                  {aiConfigured ? (
                    <span className="text-sm"><span className="text-green-400">✓</span> <span className="text-slate-300">{aiLabel}</span></span>
                  ) : (
                    <Link href="/settings/ai" className="text-sm text-indigo-400 hover:text-indigo-300">Configure</Link>
                  )}
                </div>

                {/* Messengers */}
                {messengers.map(m => {
                  const label = MESSENGER_LABELS[m] ?? m;
                  const st = messengerStatus(m);
                  const connected = st?.connected ?? false;
                  return (
                    <div key={m} className="flex items-center justify-between py-3 border-b border-slate-800">
                      <span className="text-sm text-slate-300">{label}</span>
                      {connected ? (
                        <span className="text-sm"><span className="text-green-400">✓</span> <span className="text-slate-300">Connected</span></span>
                      ) : (
                        <button onClick={() => setSetupModal(m)} className="text-sm text-indigo-400 hover:text-indigo-300">Connect</button>
                      )}
                    </div>
                  );
                })}

                {/* Plan */}
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <span className="text-sm text-slate-300">Plan</span>
                  {plan === "pro" ? (
                    <span className="text-sm"><span className="text-green-400">✓</span> <span className="text-slate-300">Pro</span></span>
                  ) : (
                    <button onClick={handleUpgrade} disabled={upgradeLoading} className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                      {upgradeLoading ? "Redirecting…" : "Upgrade"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Activity */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Activity</h2>
              <div className="space-y-6">
                {/* Messages */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-slate-300">Messages today</span>
                    <span className="text-sm text-slate-400">
                      {usage.messagesUsed}{msgLimit ? ` / ${msgLimit}` : ""}
                    </span>
                  </div>
                  {msgLimit ? (
                    <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${msgPct > 80 ? "bg-amber-500" : "bg-indigo-500"}`}
                        style={{ width: `${msgPct}%` }}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Hours */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-slate-300">Hours active</span>
                    <span className="text-sm text-slate-400">
                      {usage.hoursActive.toFixed(1)} / 8
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${hoursPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Messenger setup modal */}
      {setupModal && (
        <MessengerSetupModal
          messenger={setupModal}
          onClose={() => { setSetupModal(null); fetchMessengerStatus(); }}
          onConnected={() => fetchMessengerStatus()}
        />
      )}
    </>
  );
}
