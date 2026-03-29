"use client";

import { useEffect, useState, useCallback } from "react";
import { MessengerSetupModal } from "./messenger-setup-modal";

const MESSENGER_CONFIG: Record<string, { name: string; icon: string }> = {
  telegram: { name: "Telegram", icon: "💬" },
  whatsapp: { name: "WhatsApp", icon: "📱" },
  discord: { name: "Discord", icon: "🎮" },
  slack: { name: "Slack", icon: "💼" },
  signal: { name: "Signal", icon: "🔒" },
};

const PROVIDER_LABELS: Record<string, string> = {
  oracle: "Oracle Cloud",
  azure: "Azure",
  digitalocean: "DigitalOcean",
};

interface MessengerStatus {
  messenger: string;
  connected: boolean;
  configured: boolean;
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
  const [statuses, setStatuses] = useState<MessengerStatus[]>([]);
  const [setupModal, setSetupModal] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging/status");
      if (res.ok) {
        const data = await res.json();
        const platforms = data.platforms ?? {};
        setStatuses(
          Object.entries(platforms).map(([key, val]: [string, any]) => ({
            messenger: key,
            connected: val.connected ?? false,
            configured: val.configured ?? false,
          }))
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messengers.length > 0) {
      fetchStatus();
      const id = setInterval(fetchStatus, 30_000);
      return () => clearInterval(id);
    }
  }, [messengers.length, fetchStatus]);

  const providerActive = hosting === "oracle" || providerConnected;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {messengers.map((m) => {
          const config = MESSENGER_CONFIG[m];
          if (!config) return null;
          const s = statuses.find((x) => x.messenger === m);
          const connected = s?.connected ?? false;

          return (
            <button
              key={m}
              onClick={() => !connected && setSetupModal(m)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                connected
                  ? "bg-green-900/30 text-green-400 border border-green-800/50"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300 cursor-pointer"
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.name}</span>
              {connected ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-slate-500">Set up</span>
              )}
            </button>
          );
        })}

        {messengers.length === 0 && (
          <span className="text-xs text-slate-500">No messengers configured</span>
        )}

        {/* Cloud provider badge */}
        {hosting && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${
              providerActive
                ? "bg-slate-800/50 text-slate-400 border-slate-700"
                : "bg-slate-800/50 text-slate-500 border-slate-700/50"
            }`}
          >
            ☁️ {PROVIDER_LABELS[hosting] ?? hosting}
            {providerActive && <span className="text-green-500">✓</span>}
          </span>
        )}
      </div>

      {setupModal && (
        <MessengerSetupModal
          messenger={setupModal}
          onClose={() => {
            setSetupModal(null);
            fetchStatus();
          }}
          onConnected={() => fetchStatus()}
        />
      )}
    </>
  );
}
