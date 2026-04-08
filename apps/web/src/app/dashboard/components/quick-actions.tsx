"use client";

import Link from "next/link";

interface QuickActionsProps {
  ipAddress?: string | null;
  isActive: boolean;
  disabled?: boolean;
}

export function QuickActions({ ipAddress, isActive, disabled }: QuickActionsProps) {
  const disableAll = disabled || !isActive;
  return (
    <div className="flex flex-wrap gap-3">
      {isActive && ipAddress && !disabled ? (
        <a
          href={`https://${ipAddress}.sslip.io`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <span className="text-base">↗</span>
          Open Control Panel
        </a>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-sm font-medium text-slate-500 cursor-not-allowed">
          <span className="text-base">↗</span>
          Open Control Panel
        </span>
      )}

      {disableAll ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-sm font-medium text-slate-500 cursor-not-allowed">
          <span className="text-base">⚙</span>
          Settings
        </span>
      ) : (
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <span className="text-base">⚙</span>
          Settings
        </Link>
      )}

      <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-sm font-medium text-slate-500 cursor-not-allowed">
        <span className="text-base">📋</span>
        View Logs
      </span>
    </div>
  );
}
