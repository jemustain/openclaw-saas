"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle,
  Send,
  Hash,
  MessageSquare,
  Shield,
} from "lucide-react";
import { MessengerSetupModal } from "./messenger-setup-modal";

const MESSENGER_CONFIG: Record<
  string,
  {
    name: string;
    icon: typeof MessageCircle;
    color: string;
  }
> = {
  whatsapp: { name: "WhatsApp", icon: MessageCircle, color: "text-green-400" },
  telegram: { name: "Telegram", icon: Send, color: "text-blue-400" },
  slack: { name: "Slack", icon: Hash, color: "text-purple-400" },
  discord: { name: "Discord", icon: MessageSquare, color: "text-indigo-400" },
  signal: { name: "Signal", icon: Shield, color: "text-blue-300" },
};

interface MessengerMiniCardProps {
  messengerKey: string;
  initialConnected?: boolean;
  initialConfigured?: boolean;
}

export function MessengerMiniCard({
  messengerKey,
  initialConnected = false,
  initialConfigured = false,
}: MessengerMiniCardProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [configured, setConfigured] = useState(initialConfigured);
  const [showModal, setShowModal] = useState(false);

  const config = MESSENGER_CONFIG[messengerKey];
  if (!config) return null;

  const Icon = config.icon;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging/status");
      if (res.ok) {
        const data = await res.json();
        const platform = data.platforms?.[messengerKey];
        if (platform) {
          setConnected(platform.connected ?? false);
          setConfigured(platform.configured ?? false);
        }
      }
    } catch {
      // silently fail
    }
  }, [messengerKey]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const statusDot = connected
    ? "bg-green-500"
    : configured
      ? "bg-amber-400"
      : "bg-slate-600";

  const statusText = connected
    ? "Connected"
    : configured
      ? "Configured"
      : "Set up →";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!connected) setShowModal(true);
        }}
        className={`rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:border-slate-700 ${
          !connected ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{config.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`h-2 w-2 rounded-full ${statusDot} flex-shrink-0`}
              />
              <span className="text-xs text-slate-400">{statusText}</span>
            </div>
          </div>
        </div>
      </button>

      {showModal && (
        <MessengerSetupModal
          messenger={messengerKey}
          onClose={() => {
            setShowModal(false);
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
