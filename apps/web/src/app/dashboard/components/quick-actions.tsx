"use client";

import Link from "next/link";

interface QuickActionsProps {
  ipAddress: string | null;
  status: string | null;
}

export function QuickActions({ ipAddress, status }: QuickActionsProps) {
  const isActive = status === "active";

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {isActive && ipAddress && (
        <a
          href={`http://${ipAddress}:8787`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-slate-800 border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-colors"
        >
          Open Control Panel
        </a>
      )}
      <Link
        href="/settings"
        className="rounded-full bg-slate-800 border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-colors"
      >
        Settings
      </Link>
      <button
        disabled
        className="rounded-full bg-slate-800/50 border border-slate-700/50 px-4 py-1.5 text-sm font-medium text-slate-500 cursor-not-allowed"
      >
        View Logs
      </button>
    </div>
  );
}
