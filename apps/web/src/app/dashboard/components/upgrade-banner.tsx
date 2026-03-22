"use client";

import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";

export function UpgradeBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-6 rounded-lg border border-green-800 bg-green-900/50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <PartyPopper className="h-4 w-4 text-green-400 shrink-0" />
        <p className="text-sm text-green-300">
          Welcome to <strong>ShiftWorker Pro</strong>! Your assistant now runs
          24/7 with unlimited messages.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-green-400 hover:text-green-200 ml-4 transition"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
