"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessengerSetupModal } from "./components/messenger-setup-modal";
import { PLANS, type PlanKey } from "@/lib/stripe/config";

/* ── Types ──────────────────────────────────────────────── */

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

interface Props {
  assistant: Assistant | null;
  hosting?: string;
  providerConnected: boolean;
  messengers: string[];
  aiProvider: string | null;
  aiApiKey: string | null;
  plan: PlanKey;
}

/* ── Constants ──────────────────────────────────────────── */

const PROVIDER_LABELS: Record<string, string> = {
  oracle: "Oracle Cloud",
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

type ProvisionPhase = "creating" | "installing" | "configuring" | "starting" | "done";
const PROVISION_STEPS: { phase: ProvisionPhase; label: string; atSec: number }[] = [
  { phase: "creating", label: "Creating server…", atSec: 0 },
  { phase: "installing", label: "Installing dependencies…", atSec: 20 },
  { phase: "configuring", label: "Configuring assistant…", atSec: 60 },
  { phase: "starting", label: "Starting services…", atSec: 120 },
  { phase: "done", label: "Online", atSec: 0 },
];

type DestroyPhase = "stopping" | "deleting" | "cleaning" | "done";
const DESTROY_STEPS: { phase: DestroyPhase; label: string; atSec: number }[] = [
  { phase: "stopping", label: "Stopping services…", atSec: 0 },
  { phase: "deleting", label: "Deleting resources…", atSec: 5 },
  { phase: "cleaning", label: "Cleaning up…", atSec: 20 },
  { phase: "done", label: "Destroyed", atSec: 0 },
];

/* ── Helpers ────────────────────────────────────────────── */

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function uptime(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m uptime`;
}

/* ── Component ──────────────────────────────────────────── */

export function DashboardClient({
  assistant: initialAssistant,
  hosting,
  providerConnected,
  messengers,
  aiProvider,
  aiApiKey,
  plan,
}: Props) {
  const [current, setCurrent] = useState(initialAssistant);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  // Progress states
  const [provisioning, setProvisioning] = useState(initialAssistant?.status === "provisioning");
  const [destroying, setDestroying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState<string[]>([]);

  // Messenger states
  const [messengerStatuses, setMessengerStatuses] = useState<MessengerStatus[]>([]);
  const [setupModal, setSetupModal] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Usage
  const [usage, setUsage] = useState({ messagesUsed: 0, hoursActive: 0, limit: 100 as number | null });

  // Stripe
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const status = current?.status ?? "offline";
  const effectiveStatus = destroying ? "destroying" : provisioning ? "provisioning" : status;

  const statusDot: Record<string, string> = {
    active: "bg-green-500",
    provisioning: "bg-yellow-400 animate-pulse",
    suspended: "bg-slate-500",
    destroying: "bg-red-400 animate-pulse",
    offline: "bg-slate-600",
  };

  const statusLabel: Record<string, string> = {
    active: "Your assistant is online",
    provisioning: "Your assistant is provisioning",
    suspended: "Your assistant is suspended",
    destroying: "Your assistant is being destroyed",
    offline: "No assistant running",
  };

  /* ── Fetch messenger status ── */
  const fetchMessengerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging/status");
      if (res.ok) {
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
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messengers.length > 0) {
      fetchMessengerStatus();
      const i = setInterval(fetchMessengerStatus, 30_000);
      return () => clearInterval(i);
    }
  }, [messengers.length, fetchMessengerStatus]);

  /* ── Fetch usage ── */
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/usage/today");
        if (res.ok) setUsage(await res.json());
      } catch {}
    };
    fetchUsage();
    const i = setInterval(fetchUsage, 60_000);
    return () => clearInterval(i);
  }, []);

  /* ── Progress timer ── */
  useEffect(() => {
    if (!provisioning && !destroying) return;
    const stepsConfig = provisioning ? PROVISION_STEPS : DESTROY_STEPS;
    const start = Date.now();
    const interval = setInterval(() => {
      const el = Math.floor((Date.now() - start) / 1000);
      setElapsed(el);
      for (const step of stepsConfig) {
        if (step.phase !== "done" && el >= step.atSec) {
          setSteps((prev) => (prev.includes(step.label) ? prev : [...prev, step.label]));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [provisioning, destroying]);

  /* ── Poll during provisioning ── */
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
          if (data.assistant?.status === "active") {
            setCurrent(data.assistant);
            setProvisioning(false);
            return;
          }
          if (data.assistant?.status === "destroyed" || !data.assistant) {
            setCurrent(null);
            setProvisioning(false);
            setError("Provisioning failed.");
            return;
          }
        } catch {}
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [provisioning]);

  /* ── Poll during destroy ── */
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
          if (!data.assistant || data.assistant.status === "destroyed") {
            setCurrent(null);
            setDestroying(false);
            return;
          }
        } catch {}
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [destroying]);

  /* ── Actions ── */
  async function handleLaunch() {
    setLoading("launch");
    setError(null);
    setProvisioning(true);
    setElapsed(0);
    setSteps(["Starting provisioning…"]);
    try {
      const res = await fetch("/api/assistant/launch", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Launch failed");
        setProvisioning(false);
        setSteps([]);
      } else {
        const data = await res.json();
        setCurrent(data.assistant ?? current);
      }
    } catch {
      setError("Network error");
      setProvisioning(false);
      setSteps([]);
    } finally {
      setLoading(null);
    }
  }

  async function handleSuspend() {
    setLoading("suspend");
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
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleResume() {
    setLoading("resume");
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
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleDestroy() {
    setLoading("destroy");
    setError(null);
    setDestroying(true);
    setElapsed(0);
    setSteps(["Initiating shutdown…"]);
    setConfirmDestroy(false);
    try {
      const res = await fetch("/api/assistant/destroy", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Destroy failed");
        setDestroying(false);
        setSteps([]);
      }
    } catch {
      setError("Network error");
      setDestroying(false);
      setSteps([]);
    } finally {
      setLoading(null);
    }
  }

  async function handleDisconnect(m: string) {
    setDisconnecting(m);
    try {
      await fetch("/api/messaging/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: m }),
      });
    } catch {}
    setDisconnecting(null);
    fetchMessengerStatus();
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    setUpgradeError(null);
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
        setUpgradeError(data.error ?? "Failed to create checkout");
        setUpgradeLoading(false);
      }
    } catch {
      setUpgradeError("Network error");
      setUpgradeLoading(false);
    }
  }

  /* ── Provisioning / Destroying overlay ── */
  if (provisioning || destroying) {
    const label = provisioning ? "Provisioning your assistant" : "Destroying your assistant";
    const hint = provisioning ? "Typically takes 2–4 minutes" : "Typically takes 30–60 seconds";
    return (
      <div className="pt-8">
        <div className="flex items-center gap-3 mb-1">
          <span className={`h-2.5 w-2.5 rounded-full ${statusDot[effectiveStatus] ?? statusDot.offline}`} />
          <span className="text-xl font-medium text-white">{label}</span>
          <span className="text-sm text-slate-500 ml-auto font-mono">{formatElapsed(elapsed)}</span>
        </div>
        <p className="text-sm text-slate-500 mb-6 ml-[22px]">{hint}</p>
        <div className="space-y-2 ml-[22px]">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {isLast ? (
                  <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 text-green-400 flex-shrink-0">✓</span>
                )}
                <span className={isLast ? "text-white" : "text-slate-500"}>{step}</span>
              </div>
            );
          })}
        </div>
        {error && <p className="text-sm text-red-400 mt-4 ml-[22px]">{error}</p>}
      </div>
    );
  }

  /* ── Build metadata string ── */
  const metaParts: string[] = [];
  if (current?.provider) metaParts.push(PROVIDER_LABELS[current.provider] ?? current.provider);
  if (current?.region) metaParts.push(current.region);
  if (current?.ip_address && status === "active") metaParts.push(current.ip_address);
  if (current?.created_at && status === "active") metaParts.push(uptime(current.created_at));

  /* ── Build checklist items ── */
  const providerOk = hosting === "oracle" || providerConnected;
  const aiConfigured = !!aiProvider && !!aiApiKey;

  const { messagesUsed, hoursActive, limit } = usage;
  const msgPct = limit ? Math.min((messagesUsed / limit) * 100, 100) : 0;
  const hoursPct = Math.min((hoursActive / 8) * 100, 100);

  return (
    <div>
      {/* ── Header: Greeting + Actions ── */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusDot[effectiveStatus] ?? statusDot.offline}`} />
          <h1 className="text-xl font-medium text-white">
            {statusLabel[effectiveStatus] ?? "No assistant running"}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {status === "active" && (
            <button
              disabled={!!loading}
              onClick={handleSuspend}
              className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 transition"
            >
              {loading === "suspend" ? "Suspending…" : "Suspend"}
            </button>
          )}
          {status === "suspended" && (
            <button
              disabled={!!loading}
              onClick={handleResume}
              className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition"
            >
              {loading === "resume" ? "Resuming…" : "Resume"}
            </button>
          )}
          {current && !confirmDestroy && (
            <button
              onClick={() => setConfirmDestroy(true)}
              className="text-sm text-red-400/70 hover:text-red-400 transition"
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
                className="text-sm text-red-400 font-medium hover:text-red-300 disabled:opacity-50"
              >
                Yes, destroy
              </button>
              <button
                onClick={() => setConfirmDestroy(false)}
                className="text-sm text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          )}
          {!current && (
            <button
              disabled={!!loading}
              onClick={handleLaunch}
              className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition"
            >
              {loading === "launch" ? "Launching…" : "Launch Assistant"}
            </button>
          )}
        </div>
      </div>

      {/* ── Metadata ── */}
      {metaParts.length > 0 && (
        <p className="text-sm text-slate-500 mb-8 ml-[22px]">
          {metaParts.join(" · ")}
        </p>
      )}
      {metaParts.length === 0 && <div className="mb-8" />}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {/* ── Two columns ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* ── Left: Setup ── */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Setup</h2>
          <div className="space-y-0">
            {/* Cloud provider */}
            <ChecklistItem
              label="Cloud provider"
              value={hosting ? (PROVIDER_LABELS[hosting] ?? hosting) : undefined}
              done={providerOk}
              action={
                hosting && !providerOk
                  ? { href: `/api/auth/${hosting}`, label: "Connect" }
                  : !hosting
                    ? { href: "/settings/provider", label: "Set up" }
                    : undefined
              }
            />
            {/* AI Model */}
            <ChecklistItem
              label="AI model"
              value={aiConfigured ? (AI_LABELS[aiProvider!] ?? aiProvider!) : undefined}
              done={aiConfigured}
              action={!aiConfigured ? { href: "/settings/ai", label: "Set up →" } : { href: "/settings/ai", label: "Change" }}
            />
            {/* Messengers */}
            {messengers.map((m) => {
              const st = messengerStatuses.find((s) => s.messenger === m);
              const connected = st?.connected ?? false;
              return (
                <ChecklistItem
                  key={m}
                  label={MESSENGER_LABELS[m] ?? m}
                  done={connected}
                  value={connected ? "Connected" : undefined}
                  action={
                    !connected
                      ? { onClick: () => setSetupModal(m), label: "Connect" }
                      : { onClick: () => handleDisconnect(m), label: disconnecting === m ? "…" : "Disconnect", destructive: true }
                  }
                />
              );
            })}
            {messengers.length === 0 && (
              <ChecklistItem label="Messengers" done={false} action={{ href: "/settings/messengers", label: "Set up →" }} />
            )}
            {/* Plan */}
            <ChecklistItem
              label="Plan"
              value={PLANS[plan].name}
              done={plan !== "free"}
              action={
                plan === "free"
                  ? { onClick: handleUpgrade, label: upgradeLoading ? "Redirecting…" : "Upgrade →" }
                  : { href: "/api/stripe/portal", label: "Manage" }
              }
            />
            {upgradeError && <p className="text-xs text-red-400 mt-1 ml-6">{upgradeError}</p>}
          </div>
        </div>

        {/* ── Right: Activity ── */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Activity</h2>
          <div className="space-y-5">
            <UsageStat
              label="Messages today"
              value={messagesUsed}
              max={limit}
              pct={limit ? msgPct : null}
            />
            <UsageStat
              label="Hours active"
              value={Number(hoursActive.toFixed(1))}
              max={8}
              pct={hoursPct}
            />
          </div>
        </div>
      </div>

      {/* Messenger setup modal */}
      {setupModal && (
        <MessengerSetupModal
          messenger={setupModal}
          onClose={() => {
            setSetupModal(null);
            fetchMessengerStatus();
          }}
          onConnected={() => {
            fetchMessengerStatus();
          }}
        />
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function ChecklistItem({
  label,
  value,
  done,
  action,
}: {
  label: string;
  value?: string;
  done: boolean;
  action?: {
    href?: string;
    onClick?: () => void;
    label: string;
    destructive?: boolean;
  };
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0">
      <div className="flex items-center gap-2.5">
        {done ? (
          <span className="text-green-400 text-sm w-4 text-center">✓</span>
        ) : (
          <span className="text-slate-600 text-sm w-4 text-center">○</span>
        )}
        <span className="text-sm text-slate-300">{label}</span>
        {value && <span className="text-sm text-slate-500">{value}</span>}
      </div>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className={`text-xs ${action.destructive ? "text-red-400/70 hover:text-red-400" : "text-slate-500 hover:text-slate-300"} transition`}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className={`text-xs ${action.destructive ? "text-red-400/70 hover:text-red-400" : "text-slate-500 hover:text-slate-300"} transition`}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

function UsageStat({
  label,
  value,
  max,
  pct,
}: {
  label: string;
  value: number;
  max: number | null;
  pct: number | null;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm text-slate-400 font-mono">
          {value}{max !== null ? ` / ${max}` : ""}
        </span>
      </div>
      {pct !== null && (
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct > 80 ? "bg-amber-500" : "bg-indigo-500/70"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
