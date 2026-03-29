"use client";

import { useEffect, useState, useCallback } from "react";
import { MessengerSetupModal } from "./messenger-setup-modal";

const MESSENGER_CONFIG: Record<
  string,
  { name: string; icon: string; color: string }
> = {
  telegram: { name: "Telegram", icon: "", color: "text-blue-400" },
  whatsapp: { name: "WhatsApp", icon: "", color: "text-green-400" },
  discord: { name: "Discord", icon: "", color: "text-indigo-400" },
  slack: { name: "Slack", icon: "", color: "text-purple-400" },
  signal: { name: "Signal", icon: "", color: "text-blue-300" },
};

interface MessengerStatus {
  messenger: string;
  connected: boolean;
  configured: boolean;
  botLink?: string | null;
}

interface ConnectionsCardProps {
  hosting?: string;
  providerConnected?: boolean;
  messengers?: string[];
}

export function ConnectionsCard({
  messengers = [],
}: ConnectionsCardProps) {
  const [messengerStatuses, setMessengerStatuses] = useState<
    MessengerStatus[]
  >([]);
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
      const res = await fetch('/api/messaging/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: messengerKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Disconnect failed:', data.error);
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting(null);
      fetchMessengerStatus();
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 h-full">
        <h2 className="text-lg font-semibold text-white mb-4">Messengers</h2>

        <div className="space-y-3">
          {messengers.map((m) => {
            const config = MESSENGER_CONFIG[m];
            if (!config) return null;

            const status = messengerStatuses.find((s) => s.messenger === m);
            const connected = status?.connected ?? false;
            const configured = status?.configured ?? false;
            const botLink = status?.botLink;

            let statusColor = "text-slate-600";
            let statusLabel = "Not set up";
            if (connected) {
              statusColor = "text-green-500";
              statusLabel = "Connected";
            } else if (configured) {
              statusColor = "text-amber-400";
              statusLabel = "Configured";
            }

            return (
              <div key={m} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span className="text-slate-300">{config.name}</span>
                  <span className={`text-xs ${statusColor}`}>
                    ● {statusLabel}
                  </span>
                </div>
                {connected && (
                  <div className="flex items-center gap-2">
                    {botLink && (
                      <a
                        href={botLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={disconnecting === m}
                      onClick={() => handleDisconnect(m)}
                      className="rounded-md bg-red-900/50 px-3 py-1 text-xs text-red-400 hover:bg-red-900/80 disabled:opacity-50"
                    >
                      {disconnecting === m ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                )}
                {!connected && configured && (
                  <button
                    type="button"
                    onClick={() => setSetupModal(m)}
                    className="rounded-md bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500"
                  >
                    Reconnect
                  </button>
                )}
                {!connected && !configured && (
                  <button
                    type="button"
                    onClick={() => setSetupModal(m)}
                    className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-400 hover:bg-slate-700"
                  >
                    Set up
                  </button>
                )}
              </div>
            );
          })}

          {messengers.length === 0 && (
            <p className="text-slate-500 text-sm">
              No messengers configured
            </p>
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
