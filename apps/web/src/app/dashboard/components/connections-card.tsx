"use client";

import { useEffect, useState, useCallback } from "react";
import { Send, MessageCircle, Hash, Slack, Shield } from "lucide-react";
import { MessengerSetupModal } from "./messenger-setup-modal";

const ALL_MESSENGERS = ["telegram", "whatsapp"] as const;

const MESSENGER_CONFIG: Record<
  string,
  { name: string; icon: typeof Send; color: string }
> = {
  telegram: { name: "Telegram", icon: Send, color: "text-blue-400" },
  whatsapp: { name: "WhatsApp", icon: MessageCircle, color: "text-green-400" },
  discord: { name: "Discord", icon: Hash, color: "text-indigo-400" },
  slack: { name: "Slack", icon: Slack, color: "text-purple-400" },
  signal: { name: "Signal", icon: Shield, color: "text-blue-300" },
};

interface MessengerStatus {
  messenger: string;
  connected: boolean;
  configured: boolean;
  botLink?: string | null;
}

export function ConnectionsCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6" data-testid="connections-card-skeleton">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-800/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800/40" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-md bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ConnectionsCardProps {
  messengers?: string[];
  disabled?: boolean;
  plan?: string;
  telegramBotUsername?: string;
}

export function ConnectionsCard({
  messengers = [],
  disabled = false,
  plan = "free",
  telegramBotUsername,
}: ConnectionsCardProps) {
  const [messengerStatuses, setMessengerStatuses] = useState<
    MessengerStatus[]
  >([]);
  const [setupModal, setSetupModal] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const isFree = plan === "free";

  const fetchMessengerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging/status");
      if (res.ok) {
        const data = await res.json();
        const platforms = data.platforms ?? {};
        const statuses: MessengerStatus[] = Object.entries(platforms).map(
          ([key, val]: [string, any]) => ({
            messenger: key,
            connected: val.connected ?? false,
            configured: val.configured ?? false,
            botLink: val.botLink ?? null,
          })
        );
        setMessengerStatuses(statuses);
      }
    } catch {
      setFetchError("Failed to load connections");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchMessengerStatus();
    const interval = setInterval(fetchMessengerStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchMessengerStatus]);

  const connectedMessenger = messengerStatuses.find((s) => s.connected);
  const hasConnection = !!connectedMessenger;
  // Free users: locked if already have a connection and this isn't the connected one
  const isLockedForFree = (key: string) =>
    isFree && hasConnection && connectedMessenger?.messenger !== key;

  const handleDisconnect = async (messengerKey: string) => {
    setDisconnecting(messengerKey);
    try {
      const res = await fetch("/api/messaging/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: messengerKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Disconnect failed:", data.error);
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setDisconnecting(null);
      fetchMessengerStatus();
    }
  };

  const handleSwitchConfirm = async (newMessenger: string) => {
    if (!connectedMessenger) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/messaging/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: connectedMessenger.messenger }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Disconnect failed:", data.error);
        return;
      }
      await fetchMessengerStatus();
      setSwitchConfirm(null);
      setSetupModal(newMessenger);
    } catch (err) {
      console.error("Switch error:", err);
    } finally {
      setSwitching(false);
    }
  };

  const handleConnectClick = (key: string) => {
    // Free user with existing connection → show switch confirmation
    if (isFree && hasConnection && connectedMessenger?.messenger !== key) {
      setSwitchConfirm(key);
      return;
    }
    setSetupModal(key);
  };

  // Build the ordered list of messengers to display:
  // 1. User's selected messengers first (from DB)
  // 2. Then remaining available messengers
  const displayMessengers: string[] = [
    ...messengers.filter((m) => ALL_MESSENGERS.includes(m as any)),
    ...ALL_MESSENGERS.filter((m) => !messengers.includes(m)),
  ];

  if (fetchLoading) return <ConnectionsCardSkeleton />;

  if (fetchError && messengerStatuses.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6" data-testid="connections-card-error">
        <h2 className="text-lg font-semibold text-white mb-2">Connections</h2>
        <p className="text-sm text-red-400 mb-3">{fetchError}</p>
        <button
          onClick={() => { setFetchLoading(true); fetchMessengerStatus(); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Connections</h2>
          {isFree && (
            <span className="text-xs text-slate-500">1 messenger on Free</span>
          )}
        </div>

        <div className="space-y-3">
          {displayMessengers.map((m) => {
            const config = MESSENGER_CONFIG[m];
            if (!config) return null;

            const status = messengerStatuses.find((s) => s.messenger === m);
            const connected = status?.connected ?? false;
            const configured = status?.configured ?? false;
            const botLink = status?.botLink;
            const locked = isLockedForFree(m);
            const isUserSelected = messengers.includes(m);

            let statusColor = "text-slate-600";
            let statusLabel = "Not set up";
            if (connected) {
              statusColor = "text-green-500";
              statusLabel = "Connected";
            } else if (configured) {
              statusColor = "text-amber-400";
              statusLabel = "Configured";
            } else if (m === "telegram" && telegramBotUsername) {
              statusColor = "text-cyan-400";
              statusLabel = "Bot ready";
            } else if (isUserSelected) {
              statusColor = "text-amber-400";
              statusLabel = "Needs setup";
            }

            // For free plan, only show the connected/configured messenger
            // Hide other messengers entirely, show "Change messenger" link instead
            if (isFree && !connected && !configured && !(m === "telegram" && telegramBotUsername)) {
              return null;
            }

            // Determine the bot link for Telegram
            const telegramLink = m === "telegram" && telegramBotUsername
              ? `https://t.me/${telegramBotUsername}`
              : botLink;

            return (
              <div key={m}>
                <div
                  className={`flex items-center justify-between py-2 ${locked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    {(() => { const Icon = config.icon; return <Icon className={`w-5 h-5 ${config.color}`} />; })()}
                    <span className={`font-medium ${isUserSelected || connected ? "text-white" : "text-slate-400"}`}>{config.name}</span>
                    <span className={`text-xs ${statusColor}`}>
                      ● {statusLabel}
                    </span>
                  </div>

                  {/* Connected: show Open + Disconnect */}
                  {connected && (
                    <div className="flex items-center gap-2">
                      {(telegramLink || botLink) && (
                        <a
                          href={telegramLink || botLink!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          Open in {config.name}
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={disconnecting === m || disabled}
                        onClick={() => handleDisconnect(m)}
                        className="rounded-md bg-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/80 disabled:opacity-50"
                      >
                        {disconnecting === m ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </div>
                  )}

                  {/* User selected but not connected and not configured: Setup */}
                  {!connected && !configured && isUserSelected && !locked && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleConnectClick(m)}
                      className="rounded-md bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set Up
                    </button>
                  )}

                  {/* Configured but not connected: Reconnect */}
                  {!connected && configured && !locked && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleConnectClick(m)}
                      className="rounded-md bg-slate-700 px-3 py-1.5 text-xs text-white hover:bg-slate-600 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reconnect
                    </button>
                  )}

                  {/* Not selected, not connected, not configured, not locked: Connect */}
                  {!connected && !configured && !isUserSelected && !locked && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleConnectClick(m)}
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Connect
                    </button>
                  )}

                  {/* Locked (free plan, already have a connection): show switch or upgrade */}
                  {!connected && locked && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleConnectClick(m)}
                        className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Switch to this messenger (disconnects current)"
                      >
                        Switch
                      </button>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400 border border-violet-500/20">
                        🔒 Pro
                      </span>
                    </div>
                  )}
                </div>

                {/* Inline switch confirmation with upsell */}
                {switchConfirm === m && (
                  <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-3">
                    <p className="text-xs text-slate-300 mb-3">
                      Switching to{" "}
                      <span className="font-medium text-white">{config.name}</span>
                      {" "}will disconnect your{" "}
                      <span className="font-medium text-white">
                        {MESSENGER_CONFIG[connectedMessenger?.messenger ?? ""]?.name}
                      </span>{" "}
                      connection.
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href="/dashboard/billing"
                        className="flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition-all"
                      >
                        ✨ Keep both - Upgrade to Pro
                      </a>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={switching}
                          onClick={() => handleSwitchConfirm(m)}
                          className="rounded-md bg-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-600 disabled:opacity-50"
                        >
                          {switching ? "Switching…" : "Switch anyway"}
                        </button>
                        <button
                          type="button"
                          disabled={switching}
                          onClick={() => setSwitchConfirm(null)}
                          className="px-3 py-1 text-xs text-slate-500 hover:text-slate-400 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Free plan: show change messenger option */}
          {isFree && hasConnection && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSwitchConfirm(
                  connectedMessenger?.messenger === "telegram" ? "whatsapp" : "telegram"
                )}
                className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
              >
                Change messenger...
              </button>
            </div>
          )}
        </div>
      </div>

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
    </>
  );
}
