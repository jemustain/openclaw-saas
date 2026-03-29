"use client";

import { useEffect, useState, useCallback } from "react";
import { MessengerSetupModal } from "./messenger-setup-modal";
import {
  MessageCircle,
  Phone,
  Hash,
  Slack,
  Shield,
} from "lucide-react";

const MESSENGER_CONFIG: Record<
  string,
  { name: string; icon: React.ElementType; color: string }
> = {
  telegram: { name: "Telegram", icon: MessageCircle, color: "text-blue-400" },
  whatsapp: { name: "WhatsApp", icon: Phone, color: "text-green-400" },
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

interface MessengerMiniCardProps {
  messengerKey: string;
  status?: MessengerStatus;
  onRequestSetup: (key: string) => void;
}

function MessengerMiniCardInner({
  messengerKey,
  status,
  onRequestSetup,
}: MessengerMiniCardProps) {
  const config = MESSENGER_CONFIG[messengerKey];
  if (!config) return null;

  const connected = status?.connected ?? false;
  const configured = status?.configured ?? false;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => {
        if (!connected) onRequestSetup(messengerKey);
      }}
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${
        connected
          ? "border-slate-700 bg-slate-900/60 cursor-default"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:scale-[1.03] cursor-pointer"
      }`}
    >
      <Icon className={`h-6 w-6 ${config.color}`} />
      <span className="text-sm font-medium text-slate-200">{config.name}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            connected
              ? "bg-green-500"
              : configured
              ? "bg-amber-400"
              : "bg-slate-600"
          }`}
        />
        <span
          className={`text-xs ${
            connected
              ? "text-green-400"
              : configured
              ? "text-amber-400"
              : "text-slate-500"
          }`}
        >
          {connected ? "Connected" : configured ? "Reconnect" : "Set up"}
        </span>
      </div>
    </button>
  );
}

/* ── Wrapper that owns the modal + polling ── */

export function MessengerMiniCards({
  messengers,
}: {
  messengers: string[];
}) {
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
            botLink: val.botLink ?? null,
          }))
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (messengers.length === 0) return;
    fetchStatus();
    const iv = setInterval(fetchStatus, 30_000);
    return () => clearInterval(iv);
  }, [messengers.length, fetchStatus]);

  if (messengers.length === 0) return null;

  return (
    <>
      {messengers.map((m) => (
        <MessengerMiniCardInner
          key={m}
          messengerKey={m}
          status={statuses.find((s) => s.messenger === m)}
          onRequestSetup={setSetupModal}
        />
      ))}

      {setupModal && (
        <MessengerSetupModal
          messenger={setupModal}
          onClose={() => {
            setSetupModal(null);
            fetchStatus();
          }}
          onConnected={() => {
            fetchStatus();
          }}
        />
      )}
    </>
  );
}
