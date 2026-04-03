'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCode, Bot, Smartphone, Hash, Slack,
  Loader2,
} from 'lucide-react';

type MessengerSetupInfo = {
  title: string;
  pendingMsg: string;
  readyMsg: string;
  icon: typeof QrCode;
};

const MESSENGER_SETUP_INFO: Record<string, MessengerSetupInfo> = {
  whatsapp: {
    title: 'WhatsApp',
    pendingMsg: 'Your server is starting up - QR code will appear here shortly.',
    readyMsg: 'Ready to connect! Scan the QR code below with WhatsApp to link your assistant.',
    icon: QrCode,
  },
  telegram: {
    title: 'Telegram',
    pendingMsg: 'Your server is starting up - connection setup will appear here shortly.',
    readyMsg: 'Connect your assistant to Telegram with a simple pairing flow.',
    icon: Bot,
  },
  discord: {
    title: 'Discord',
    pendingMsg: 'Your server is starting up - bot invite link will appear here shortly.',
    readyMsg: 'Ready to connect! Click the invite link to add your bot to a Discord server.',
    icon: Hash,
  },
  slack: {
    title: 'Slack',
    pendingMsg: 'Your server is starting up - workspace connection will appear here shortly.',
    readyMsg: 'Ready to connect! Click below to install the ShiftWorker app to your Slack workspace.',
    icon: Slack,
  },
  signal: {
    title: 'Signal',
    pendingMsg: 'Your server is starting up - connection setup will appear here shortly.',
    readyMsg: 'Ready to connect! Follow the instructions below to link Signal.',
    icon: Smartphone,
  },
};

/**
 * Messenger setup card for the onboarding wizard.
 *
 * IMPORTANT: This component is defined at module level (not inside the wizard)
 * so that React treats it as a stable component type across re-renders.
 * Defining it inline inside the wizard caused it to unmount/remount on every
 * parent state change, resetting its internal state and creating infinite
 * setup loops.
 */
export function MessengerSetupCard({ messengerId, isServerActive, onReady }: {
  messengerId: string;
  isServerActive: boolean;
  onReady?: (platform: string, link: string) => void;
}) {
  const info = MESSENGER_SETUP_INFO[messengerId];
  const [status, setStatus] = useState<'waiting' | 'setting-up' | 'ready' | 'connected' | 'failed'>('waiting');
  const [botLink, setBotLink] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [controlUiUrl, setControlUiUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrExpired, setQrExpired] = useState(false);

  const isWhatsApp = messengerId === 'whatsapp';
  const [waMethod, setWaMethod] = useState<'qr' | 'phone'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'phone';
    return 'qr';
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const setupAttempted = useRef(false);

  // Trigger setup via sidecar (all messengers including Telegram)
  const triggerSetup = useCallback(async () => {
    setStatus('setting-up');
    setError(null);
    setQrExpired(false);
    try {
      const res = await fetch('/api/messaging/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: messengerId }),
      });
      if (!res.ok) {
        setError('Setup is taking longer than expected. Please try again.');
        setStatus('failed');
        return;
      }
      const data = await res.json();

      if (data.status === 'failed' && data.error) {
        setError(data.error);
        setStatus('failed');
      } else if (data.status === 'pending' && data.error) {
        // VM not ready - retry after delay instead of going back to 'waiting' (avoids infinite loop)
        setError(null);
        setTimeout(() => triggerSetup(), 10000);
      } else if (data.botLink) {
        setBotLink(data.botLink);
        setStatus('ready');
        onReady?.(messengerId, data.botLink);
      } else if (data.controlUiUrl) {
        setControlUiUrl(data.controlUiUrl);
        setStatus('ready');
      } else if (data.qr) {
        setQrCode(data.qr);
        setStatus('ready');
      } else if (data.status === 'configured' || data.status === 'connected') {
        setStatus('connected');
        if (data.botLink) onReady?.(messengerId, data.botLink);
      } else {
        setStatus('ready');
      }
    } catch {
      // Setup may have succeeded but timed out - check status before giving up
      try {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch('/api/messaging/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const platformStatus = statusData?.platforms?.[messengerId] || statusData?.statuses?.find?.((s: any) => s.messenger === messengerId);
          if (platformStatus?.connected || platformStatus?.configured) {
            setStatus('connected');
            if (platformStatus.botLink) {
              setBotLink(platformStatus.botLink);
              onReady?.(messengerId, platformStatus.botLink);
            }
            return;
          }
        }
      } catch { /* ignore */ }
      setError('Connection timed out. Please try again.');
      setStatus('failed');
    }
  }, [messengerId, onReady]);

  const requestPairingCode = useCallback(async () => {
    if (!phoneNumber.trim()) return;
    setPhoneLoading(true); setPhoneError(null); setPairingCode(null);
    try {
      const res = await fetch('/api/messaging/whatsapp/pairing-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setPhoneError(data.error || `Failed (${res.status})`);
      else if (data.pairingCode) setPairingCode(data.pairingCode);
      else setPhoneError('No pairing code returned');
    } catch { setPhoneError('Failed to request pairing code'); }
    setPhoneLoading(false);
  }, [phoneNumber]);

  // Poll status while setup is in progress - self-heals if setup call times out
  useEffect(() => {
    if (status !== 'setting-up') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/messaging/status');
        if (!res.ok) return;
        const data = await res.json();
        const ps = data?.platforms?.[messengerId];
        if (ps?.connected || ps?.configured) {
          setStatus('connected');
          if (ps.botLink) setBotLink(ps.botLink);
          onReady?.(messengerId, ps.botLink || '');
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [status, messengerId, onReady]);

  // Auto-trigger setup when server comes online (all messengers)
  useEffect(() => {
    if (!isServerActive || status !== 'waiting') return;
    if (setupAttempted.current) return;
    setupAttempted.current = true;
    triggerSetup();
  }, [isServerActive, status, triggerSetup]);

  // Poll for QR-based connections (WhatsApp/Signal)
  useEffect(() => {
    if (status !== 'ready' || !qrCode) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
        try {
          const res = await fetch('/api/messaging/status');
          if (!res.ok) continue;
          const data = await res.json();
          const plat = data.platforms?.[messengerId];
          if (plat?.connected) {
            setStatus('connected');
            if (plat.botLink) onReady?.(messengerId, plat.botLink);
            return;
          }
        } catch { /* ignore */ }
      }
      if (!cancelled && attempts >= maxAttempts) {
        setQrExpired(true);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [status, qrCode, messengerId, onReady]);

  if (!info) return null;
  const Icon = info.icon;

  // Determine badge for display
  const badgeClass =
    status === 'waiting' ? 'bg-slate-800 text-slate-400' :
    status === 'setting-up' ? 'bg-amber-500/20 text-amber-400' :
    status === 'connected' ? 'bg-violet-500/20 text-violet-400' :
    status === 'failed' ? 'bg-red-500/20 text-red-400' :
    'bg-green-500/20 text-green-400';

  const badgeLabel =
    status === 'waiting' ? 'Waiting\u2026' :
    status === 'setting-up' ? 'Setting up\u2026' :
    status === 'connected' ? 'Connected' :
    status === 'failed' ? 'Failed' :
    'Ready';

  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-violet-400" />
          <span className="font-medium text-sm">{info.title}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Waiting state */}
      {status === 'waiting' && (
        <p className="text-xs text-slate-400 leading-relaxed">{info.pendingMsg}</p>
      )}

      {/* Setting up state */}
      {status === 'setting-up' && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          {messengerId === 'whatsapp' ? 'Generating QR code\u2026' :
           `Configuring ${info.title}\u2026`}
        </div>
      )}

      {/* Ready state - WhatsApp/Signal: QR or phone pairing */}
      {status === 'ready' && (qrCode || isWhatsApp) && !qrExpired && (messengerId === 'whatsapp' || messengerId === 'signal') && (
        <div className="space-y-3">
          {isWhatsApp && (
            <div className="flex rounded-lg bg-slate-800 p-0.5">
              <button type="button" onClick={() => setWaMethod('qr')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition ${waMethod === 'qr' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <QrCode className="w-3 h-3" /> QR Code
              </button>
              <button type="button" onClick={() => setWaMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition ${waMethod === 'phone' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Smartphone className="w-3 h-3" /> Phone Number
              </button>
            </div>
          )}
          {(waMethod === 'qr' || !isWhatsApp) && qrCode && (
            <>
              <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-200">How to connect:</p>
                <ol className="list-decimal ml-4 space-y-0.5 text-xs text-slate-400">
                  <li>Open <strong className="text-slate-300">WhatsApp</strong> on your phone</li>
                  <li>Go to <strong className="text-slate-300">Settings &rarr; Linked Devices</strong></li>
                  <li>Tap <strong className="text-slate-300">Link a Device</strong></li>
                  <li>Point your camera at the QR below</li>
                </ol>
                <p className="text-xs text-amber-400/80">View this QR on a different screen than your phone</p>
              </div>
              <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                alt={`Scan QR code with ${info.title}`} className="w-48 h-48 mx-auto rounded-lg bg-white p-1" />
              <p className="text-xs text-slate-500 text-center">Waiting for scan...</p>
            </>
          )}
          {waMethod === 'phone' && isWhatsApp && (
            <div className="space-y-2">
              <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-200">Link with phone number:</p>
                <ol className="list-decimal ml-4 space-y-0.5 text-xs text-slate-400">
                  <li>Enter your WhatsApp phone number</li>
                  <li>Tap <strong className="text-slate-300">Get Code</strong></li>
                  <li>In WhatsApp: <strong className="text-slate-300">Settings &rarr; Linked Devices &rarr; Link a Device</strong></li>
                  <li>Tap <strong className="text-slate-300">Link with Phone Number</strong></li>
                  <li>Enter the code shown here</li>
                </ol>
              </div>
              {!pairingCode && (
                <>
                  <div className="flex gap-2">
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none" />
                    <button type="button" onClick={requestPairingCode} disabled={!phoneNumber.trim() || phoneLoading}
                      className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors flex items-center gap-1">
                      {phoneLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Get Code'}
                    </button>
                  </div>
                  {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}
                </>
              )}
              {pairingCode && (
                <div className="text-center space-y-2">
                  <p className="text-xs text-slate-400">Enter this code in WhatsApp:</p>
                  <div className="text-2xl font-mono font-bold tracking-[0.3em] text-white bg-slate-800 rounded-lg py-3">{pairingCode}</div>
                  <p className="text-xs text-slate-500">Waiting for connection...</p>
                  <button type="button" onClick={() => { setPairingCode(null); setPhoneError(null); }}
                    className="text-xs text-violet-400 hover:text-violet-300">Request a new code</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ready state - WhatsApp Control UI link */}
      {status === 'ready' && controlUiUrl && !qrCode && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            Open your assistant&apos;s control panel to connect WhatsApp. Go to <strong>Channels</strong> and scan the QR code.
          </p>
          <a
            href={controlUiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-lg bg-green-600 hover:bg-green-500 py-3 text-sm font-medium transition"
          >
            Open Control Panel
          </a>
        </div>
      )}

      {/* QR expired */}
      {status === 'ready' && qrExpired && (
        <div className="space-y-2">
          <p className="text-xs text-amber-400">QR code expired</p>
          <button
            type="button"
            onClick={triggerSetup}
            className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-sm font-medium transition border border-slate-700"
          >
            Regenerate QR Code
          </button>
        </div>
      )}

      {/* Ready state - Discord/Slack: show link */}
      {status === 'ready' && botLink && messengerId !== 'whatsapp' && messengerId !== 'signal' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">{info.readyMsg}</p>
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-lg bg-violet-600 hover:bg-violet-500 py-2 text-sm font-medium transition"
          >
            Connect {info.title} &rarr;
          </a>
        </div>
      )}

      {/* Ready state - generic (no link, no QR) */}
      {status === 'ready' && !botLink && !qrCode && (
        <p className="text-xs text-slate-300">{info.readyMsg}</p>
      )}

      {/* Connected state */}
      {status === 'connected' && (
        <p className="text-xs text-green-400">{info.title} is connected!</p>
      )}

      {/* Failed state */}
      {status === 'failed' && (
        <div className="space-y-2">
          <p className="text-xs text-red-400">{error}</p>
          <button
            type="button"
            onClick={triggerSetup}
            className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-sm font-medium transition border border-slate-700"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
