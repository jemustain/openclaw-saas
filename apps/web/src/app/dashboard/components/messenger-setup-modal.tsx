"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, QrCode, Bot, Smartphone } from "lucide-react";

const MESSENGER_INFO: Record<
  string,
  {
    title: string;
    icon: typeof QrCode;
    setupInstructions: string;
  }
> = {
  whatsapp: {
    title: "WhatsApp",
    icon: QrCode,
    setupInstructions: "Scan the QR code with WhatsApp to link your assistant.",
  },
  telegram: {
    title: "Telegram",
    icon: Bot,
    setupInstructions:
      "Your Telegram bot is being created. Once ready, tap the link to start chatting.",
  },
  discord: {
    title: "Discord",
    icon: Bot,
    setupInstructions:
      "Click the invite link to add your assistant bot to a Discord server.",
  },
  slack: {
    title: "Slack",
    icon: Bot,
    setupInstructions:
      "Click below to install the ShiftWorker app to your Slack workspace.",
  },
  signal: {
    title: "Signal",
    icon: Smartphone,
    setupInstructions: "Scan the QR code with Signal to link your assistant.",
  },
};

interface MessengerSetupModalProps {
  messenger: string;
  onClose: () => void;
  onConnected?: (messenger: string, botLink?: string) => void;
}

export function MessengerSetupModal({
  messenger,
  onClose,
  onConnected,
}: MessengerSetupModalProps) {
  const info = MESSENGER_INFO[messenger];
  const [status, setStatus] = useState<
    "setting-up" | "ready" | "connected" | "failed"
  >("setting-up");
  const [botLink, setBotLink] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrExpired, setQrExpired] = useState(false);

  const triggerSetup = useCallback(async () => {
    setStatus("setting-up");
    setError(null);
    setQrExpired(false);
    try {
      const res = await fetch("/api/messaging/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: messenger }),
      });
      if (!res.ok) {
        setError(`Setup failed (HTTP ${res.status})`);
        setStatus("failed");
        return;
      }
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStatus("failed");
      } else if (data.botLink) {
        setBotLink(data.botLink);
        setStatus("ready");
      } else if (data.qr) {
        setQrCode(data.qr);
        setStatus("ready");
      } else if (
        data.status === "configured" ||
        data.status === "connected"
      ) {
        setStatus("connected");
        onConnected?.(messenger, data.botLink ?? undefined);
      } else {
        setStatus("ready");
      }
    } catch {
      setError("Failed to set up - please try again");
      setStatus("failed");
    }
  }, [messenger, onConnected]);

  // Trigger setup on mount
  useEffect(() => {
    triggerSetup();
  }, [triggerSetup]);

  // Poll for QR-based connections (WhatsApp/Signal)
  useEffect(() => {
    if (status !== "ready" || !qrCode) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
        try {
          const res = await fetch("/api/messaging/status");
          if (!res.ok) continue;
          const data = await res.json();
          const plat = data.platforms?.[messenger];
          if (plat?.connected) {
            setStatus("connected");
            onConnected?.(messenger, plat.botLink ?? undefined);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      if (!cancelled && attempts >= maxAttempts) {
        setQrExpired(true);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [status, qrCode, messenger, onConnected]);

  if (!info) return null;
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Connect {info.title}
            </h3>
            <p className="text-xs text-slate-400">{info.setupInstructions}</p>
          </div>
        </div>

        {/* Setting up */}
        {status === "setting-up" && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span className="text-slate-300">
              Setting up {info.title}...
            </span>
          </div>
        )}

        {/* Ready - Telegram bot link */}
        {status === "ready" && messenger === "telegram" && botLink && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-green-400">
              ✅ Bot created - tap to start chatting
            </p>
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-lg bg-blue-500 hover:bg-blue-400 py-3 text-sm font-medium transition text-white"
            >
              Open in Telegram →
            </a>
          </div>
        )}

        {/* Ready - QR code (WhatsApp/Signal) */}
        {status === "ready" &&
          qrCode &&
          !qrExpired &&
          (messenger === "whatsapp" || messenger === "signal") && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-slate-300 text-center">
                Scan with {info.title} to connect
              </p>
              <img
                src={
                  qrCode.startsWith("data:")
                    ? qrCode
                    : `data:image/png;base64,${qrCode}`
                }
                alt={`Scan QR code with ${info.title}`}
                className="w-48 h-48 mx-auto rounded-lg"
              />
            </div>
          )}

        {/* QR expired */}
        {status === "ready" && qrExpired && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-amber-400 text-center">
              QR code expired
            </p>
            <button
              type="button"
              onClick={triggerSetup}
              className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-medium transition border border-slate-700 text-white"
            >
              Regenerate QR Code
            </button>
          </div>
        )}

        {/* Ready - Discord/Slack link */}
        {status === "ready" &&
          botLink &&
          messenger !== "telegram" &&
          messenger !== "whatsapp" &&
          messenger !== "signal" && (
            <div className="space-y-3 pt-2">
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center rounded-lg bg-violet-600 hover:bg-violet-500 py-3 text-sm font-medium transition text-white"
              >
                Connect {info.title} →
              </a>
            </div>
          )}

        {/* Ready - generic (no link, no QR) */}
        {status === "ready" && !botLink && !qrCode && (
          <p className="text-sm text-slate-300 text-center py-4">
            {info.setupInstructions}
          </p>
        )}

        {/* Connected */}
        {status === "connected" && (
          <div className="text-center py-6 space-y-3">
            <p className="text-green-400 font-medium">
              ✅ {info.title} is connected!
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Done
            </button>
          </div>
        )}

        {/* Failed */}
        {status === "failed" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-red-400 text-center">{error}</p>
            <button
              type="button"
              onClick={triggerSetup}
              className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-medium transition border border-slate-700 text-white"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
