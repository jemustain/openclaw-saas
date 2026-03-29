"use client";

import { useEffect, useState, useCallback } from "react";
import { MessengerSetupModal } from "./messenger-setup-modal";

const PROVIDER_CONFIG: Record<string, { name: string; icon: string }> = {
  oracle: { name: "Oracle Cloud", icon: "☁️" },
  azure: { name: "Azure", icon: "☁️" },
  digitalocean: { name: "DigitalOcean", icon: "☁️" },
};

const MESSENGER_CONFIG: Record<string, { name: string; icon: string }> = {
  telegram: { name: "Telegram", icon: "💬" },
  whatsapp: { name: "WhatsApp", icon: "💬" },
  discord: { name: "Discord", icon: "💬" },
  slack: { name: "Slack", icon: "💬" },
  signal: { name: "Signal", icon: "💬" },
};

interface MessengerStatus {
  messenger: string;
  connected: boolean;
  configured: boolean;
  botLink?: string | null;
}

interface ConnectionsBadgesProps {
  hosting?: string;
  providerConnected?: boolean;
  messengers?: string[];
}

export function ConnectionsBadges({
  hosting,
  providerConnected = false,
  messengers = [],
}: ConnectionsBadgesProps) {
  const [messengerStatuses, setMessengerStatuses] = useState<MessengerStatus[]>([]);
  const [setupModal, setSetupModal] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

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
    } catch {}
  }, []);

  useEffect(() => {
    if (messengers.length > 0) {
      fetchMessengerStatus();
      const interval = setInterval(fetchMessengerStatus, 30_000);
      return () => clearInterval(interval);
    }
  }, [messengers.length, fetchMessengerStatus]);

  const handleDisconnect = async (messengerKey: string) => {
    setDisconnecting(messengerKey);
    try {
      await fetch("/api/messaging/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: messengerKey }),
      });
    } catch {}
    setDisconnecting(null);
    fetchMessengerStatus();
  };

  const providerConfig = hosting ? PROVIDER_CONFIG[hosting] : null;
  const providerActive = hosting === "oracle" || providerConnected;
  const needsOAuth = hosting === "azure" || hosting === "digitalocean";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Cloud provider badge */}
        {providerConfig && (
          providerActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-800/50 bg-green-950/40 px-3 py-1.5 text-sm text-green-400">
              {providerConfig.icon} {providerConfig.name}
              <span className="text-green-500">✓</span>
            </span>
          ) : needsOAuth ? (
            <a
              href={`/api/auth/${hosting}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:border-indigo-600 hover:text-indigo-300 transition-colors"
            >
              {providerConfig.icon} {providerConfig.name}
              <span className="text-xs text-indigo-400 ml-1">Connect</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-500">
              {providerConfig.icon} {providerConfig.name}
            </span>
          )
        )}

        {!providerConfig && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-500">
            ☁️ No provider
          </span>
        )}

        {/* Messenger badges */}
        {messengers.map((m) => {
          const config = MESSENGER_CONFIG[m];
          if (!config) return null;

          const status = messengerStatuses.find((s) => s.messenger === m);
          const connected = status?.connected ?? false;
          const configured = status?.configured ?? false;

          if (connected) {
            return (
              <span
                key={m}
                className="group inline-flex items-center gap-1.5 rounded-full border border-green-800/50 bg-green-950/40 px-3 py-1.5 text-sm text-green-400"
              >
                {config.icon} {config.name}
                <span className="text-green-500">✓</span>
                <button
                  onClick={() => handleDisconnect(m)}
                  disabled={disconnecting === m}
                  className="hidden group-hover:inline-flex ml-1 text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                  title="Disconnect"
                >
                  ✕
                </button>
              </span>
            );
          }

          return (
            <button
              key={m}
              onClick={() => setSetupModal(m)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                configured
                  ? "border-amber-800/50 bg-amber-950/30 text-amber-400 hover:border-amber-600"
                  : "border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              {config.icon} {config.name}
              <span className="text-xs ml-1">
                {configured ? "Reconnect" : "Set up"}
              </span>
            </button>
          );
        })}

        {messengers.length === 0 && !providerConfig && (
          <span className="text-sm text-slate-500">No connections configured</span>
        )}
      </div>

      {setupModal && (
        <MessengerSetupModal
          messenger={setupModal}
          onClose={() => {
            setSetupModal(null);
            fetchMessengerStatus();
          }}
          onConnected={() => fetchMessengerStatus()}
        />
      )}
    </>
  );
}
