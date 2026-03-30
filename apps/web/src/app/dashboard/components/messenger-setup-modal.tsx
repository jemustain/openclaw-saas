"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, QrCode, Bot, Smartphone, CheckCircle, Phone } from "lucide-react";

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
      "Connect your assistant to Telegram in a few simple steps.",
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

type TelegramPairingStatus =
  | "pairing-start"
  | "pairing-checking"
  | "pairing-found"
  | "pairing-confirming"
  | "connected"
  | "failed";

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
  const isTelegram = messenger === "telegram";

  // Non-Telegram state
  const [status, setStatus] = useState<
    "setting-up" | "ready" | "connected" | "failed"
  >("setting-up");
  const [botLink, setBotLink] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [controlUiUrl, setControlUiUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrExpired, setQrExpired] = useState(false);

  // WhatsApp setup method
  const isWhatsApp = messenger === "whatsapp";
  const [waMethod, setWaMethod] = useState<"qr" | "phone">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return "phone";
    return "qr";
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Telegram pairing state
  const [telegramStatus, setTelegramStatus] = useState<TelegramPairingStatus>("pairing-start");
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [telegramBotLink, setTelegramBotLink] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  // Telegram: start pairing on mount
  useEffect(() => {
    if (!isTelegram) return;
    let cancelled = false;

    const startPairing = async () => {
      try {
        const res = await fetch("/api/messaging/telegram/start-pairing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setTelegramError(`Failed to start pairing (HTTP ${res.status})`);
          setTelegramStatus("failed");
          return;
        }
        const data = await res.json();
        setPairingToken(data.pairingToken);
        setTelegramBotLink(data.botLink);
        setTelegramStatus("pairing-start");
      } catch {
        if (!cancelled) {
          setTelegramError("Failed to start pairing");
          setTelegramStatus("failed");
        }
      }
    };

    startPairing();
    return () => { cancelled = true; };
  }, [isTelegram]);

  const handleCheckPairing = useCallback(async () => {
    if (!pairingToken) return;
    setTelegramStatus("pairing-checking");
    setCheckMessage(null);
    try {
      const res = await fetch("/api/messaging/telegram/check-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingToken }),
      });
      const data = await res.json();
      if (data.paired) {
        setTelegramUsername(data.telegramUsername);
        setTelegramStatus("pairing-found");
      } else {
        setCheckMessage("No pairing found yet. Make sure you sent /start to the bot in Telegram.");
        setTelegramStatus("pairing-start");
      }
    } catch {
      setCheckMessage("Failed to check pairing. Try again.");
      setTelegramStatus("pairing-start");
    }
  }, [pairingToken]);

  const handleConfirmPairing = useCallback(async () => {
    if (!pairingToken) return;
    setTelegramStatus("pairing-confirming");
    try {
      const res = await fetch("/api/messaging/telegram/confirm-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingToken }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramStatus("connected");
        onConnected?.(messenger);
      } else {
        setTelegramError(data.error || "Failed to confirm pairing");
        setTelegramStatus("failed");
      }
    } catch {
      setTelegramError("Failed to confirm pairing");
      setTelegramStatus("failed");
    }
  }, [pairingToken, messenger, onConnected]);

  // Non-Telegram: trigger setup
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
      } else if (data.controlUiUrl) {
        setControlUiUrl(data.controlUiUrl);
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

  // WhatsApp: request pairing code
  const requestPairingCode = useCallback(async () => {
    if (!phoneNumber.trim()) return;
    setPhoneLoading(true);
    setPhoneError(null);
    setPairingCode(null);
    try {
      const res = await fetch("/api/messaging/whatsapp/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPhoneError(data.error || `Request failed (HTTP ${res.status})`);
      } else if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        setPhoneError("No pairing code returned");
      }
    } catch {
      setPhoneError("Failed to request pairing code");
    }
    setPhoneLoading(false);
  }, [phoneNumber]);

  // Non-Telegram: trigger setup on mount
  useEffect(() => {
    if (isTelegram) return;
    triggerSetup();
  }, [isTelegram, triggerSetup]);

  // Poll for QR-based connections (WhatsApp/Signal)
  useEffect(() => {
    if (isTelegram) return;
    if (status !== "ready") return;
    if (!qrCode && !pairingCode) return;
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
  }, [isTelegram, status, qrCode, pairingCode, messenger, onConnected]);

  if (!info) return null;
  const Icon = info.icon;

  // Telegram-specific rendering
  const renderTelegram = () => {
    if (telegramStatus === "pairing-start" && !pairingToken) {
      return (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span className="text-slate-300">Setting up Telegram pairing...</span>
        </div>
      );
    }

    if (telegramStatus === "pairing-start" && pairingToken) {
      return (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-300">
            To connect Telegram, tap the button below to open our bot, then send <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-violet-300">/start</code>
          </p>
          <a
            href={telegramBotLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-lg bg-blue-500 hover:bg-blue-400 py-3 text-sm font-medium transition text-white"
          >
            Open in Telegram →
          </a>
          {checkMessage && (
            <p className="text-xs text-amber-400 text-center">{checkMessage}</p>
          )}
          <button
            type="button"
            onClick={handleCheckPairing}
            className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-medium transition border border-slate-700 text-white"
          >
            Check for Pairing
          </button>
        </div>
      );
    }

    if (telegramStatus === "pairing-checking") {
      return (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span className="text-slate-300">Checking for pairing...</span>
        </div>
      );
    }

    if (telegramStatus === "pairing-found") {
      return (
        <div className="space-y-4 pt-2 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
          <p className="text-sm text-green-400 font-medium">
            Pairing found!{telegramUsername ? ` Telegram user: @${telegramUsername}` : ""}
          </p>
          <button
            type="button"
            onClick={handleConfirmPairing}
            className="w-full text-center rounded-lg bg-violet-600 hover:bg-violet-500 py-3 text-sm font-medium transition text-white"
          >
            Confirm Connection
          </button>
        </div>
      );
    }

    if (telegramStatus === "pairing-confirming") {
      return (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span className="text-slate-300">Confirming connection...</span>
        </div>
      );
    }

    if (telegramStatus === "connected") {
      return (
        <div className="text-center py-6 space-y-3">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
          <p className="text-green-400 font-medium">Telegram is connected!</p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Done
          </button>
        </div>
      );
    }

    if (telegramStatus === "failed") {
      return (
        <div className="space-y-3 pt-2">
          <p className="text-sm text-red-400 text-center">{telegramError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-medium transition border border-slate-700 text-white"
          >
            Retry
          </button>
        </div>
      );
    }

    return null;
  };

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

        {/* Telegram flow */}
        {isTelegram && renderTelegram()}

        {/* Non-Telegram flows below */}

        {/* Setting up */}
        {!isTelegram && status === "setting-up" && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span className="text-slate-300">
              Setting up {info.title}...
            </span>
          </div>
        )}

        {/* Ready - QR code or Phone pairing (WhatsApp/Signal) */}
        {!isTelegram &&
          status === "ready" &&
          (qrCode || isWhatsApp) &&
          !qrExpired &&
          (messenger === "whatsapp" || messenger === "signal") && (
            <div className="space-y-4 pt-2">
              {isWhatsApp && (
                <div className="flex rounded-lg bg-slate-800 p-1">
                  <button type="button" onClick={() => setWaMethod("qr")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${waMethod === "qr" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
                    <QrCode className="w-4 h-4" /> QR Code
                  </button>
                  <button type="button" onClick={() => setWaMethod("phone")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${waMethod === "phone" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
                    <Phone className="w-4 h-4" /> Phone Number
                  </button>
                </div>
              )}
              {(waMethod === "qr" || !isWhatsApp) && qrCode && (
                <>
                  <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-slate-200">How to connect:</p>
                    <ol className="list-decimal ml-5 space-y-1 text-xs text-slate-400">
                      <li>Open <strong className="text-slate-300">WhatsApp</strong> on your phone</li>
                      <li>Go to <strong className="text-slate-300">Settings → Linked Devices</strong></li>
                      <li>Tap <strong className="text-slate-300">Link a Device</strong></li>
                      <li>Point your camera at the QR code below</li>
                    </ol>
                    <p className="text-xs text-amber-400/80 mt-1">View this QR on a different screen than your phone</p>
                  </div>
                  <img src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt={`Scan QR code with ${info.title}`} className="w-48 h-48 mx-auto rounded-lg bg-white p-1" />
                  <p className="text-xs text-slate-500 text-center">QR refreshes automatically. Waiting for scan...</p>
                </>
              )}
              {waMethod === "phone" && isWhatsApp && (
                <div className="space-y-3">
                  <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-slate-200">Link with phone number:</p>
                    <ol className="list-decimal ml-5 space-y-1 text-xs text-slate-400">
                      <li>Enter your WhatsApp phone number below</li>
                      <li>Tap <strong className="text-slate-300">Get Code</strong></li>
                      <li>Open <strong className="text-slate-300">WhatsApp → Settings → Linked Devices</strong></li>
                      <li>Tap <strong className="text-slate-300">Link a Device</strong>, then <strong className="text-slate-300">Link with Phone Number</strong></li>
                      <li>Enter the code shown here</li>
                    </ol>
                  </div>
                  {!pairingCode && (
                    <>
                      <div className="flex gap-2">
                        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1 234 567 8900"
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none" />
                        <button type="button" onClick={requestPairingCode} disabled={!phoneNumber.trim() || phoneLoading}
                          className="px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center gap-1.5">
                          {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Code"}
                        </button>
                      </div>
                      {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}
                    </>
                  )}
                  {pairingCode && (
                    <div className="text-center space-y-3">
                      <p className="text-xs text-slate-400">Enter this code in WhatsApp:</p>
                      <div className="text-3xl font-mono font-bold tracking-[0.3em] text-white bg-slate-800 rounded-lg py-4">{pairingCode}</div>
                      <p className="text-xs text-slate-500">Code expires in a few minutes. Waiting for connection...</p>
                      <button type="button" onClick={() => { setPairingCode(null); setPhoneError(null); }}
                        className="text-xs text-violet-400 hover:text-violet-300">Request a new code</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* QR expired */}
        {!isTelegram && status === "ready" && qrExpired && (
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
        {!isTelegram &&
          status === "ready" &&
          botLink &&
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

        {/* Ready - Control UI link (WhatsApp) */}
        {!isTelegram && status === "ready" && controlUiUrl && !qrCode && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-300">
              Your assistant&apos;s control panel has a built-in WhatsApp setup. Tap the button below, then go to <strong>Channels</strong> and connect WhatsApp.
            </p>
            <a
              href={controlUiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-lg bg-green-600 hover:bg-green-500 py-3 text-sm font-medium transition text-white"
            >
              Open Control Panel
            </a>
            <p className="text-xs text-slate-500 text-center">
              Opens your assistant&apos;s dashboard in a new tab
            </p>
          </div>
        )}

        {/* Ready - generic (no link, no QR) */}
        {!isTelegram && status === "ready" && !botLink && !qrCode && !controlUiUrl && (
          <p className="text-sm text-slate-300 text-center py-4">
            {info.setupInstructions}
          </p>
        )}

        {/* Connected (non-Telegram) */}
        {!isTelegram && status === "connected" && (
          <div className="text-center py-6 space-y-3">
            <p className="text-green-400 font-medium">
              {info.title} is connected!
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

        {/* Failed (non-Telegram) */}
        {!isTelegram && status === "failed" && (
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
