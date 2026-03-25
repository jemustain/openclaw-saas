"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ConnectionsCardProps {
  digitalOceanConnected?: boolean;
}

const platforms = [
  { name: "WhatsApp", icon: "💬" },
  { name: "Telegram", icon: "✈️" },
  { name: "Slack", icon: "🔧" },
  { name: "Discord", icon: "🎮" },
];

export function ConnectionsCard({ digitalOceanConnected: initialDO = false }: ConnectionsCardProps) {
  const [doConnected, setDoConnected] = useState(initialDO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDoConnected(initialDO);
  }, [initialDO]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Connections</h2>

      <div className="space-y-3">
        {/* DigitalOcean - primary cloud provider */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🌊</span>
            <span className="text-slate-300">DigitalOcean</span>
            {doConnected ? (
              <span className="text-green-500 text-xs">● Connected</span>
            ) : (
              <span className="text-slate-600 text-xs">● Not connected</span>
            )}
          </div>
          {doConnected ? (
            <span className="rounded-md bg-green-900/30 px-3 py-1 text-xs text-green-400">
              Active
            </span>
          ) : (
            <a
              href="/api/auth/digitalocean"
              onClick={() => setLoading(true)}
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-500"
            >
              {loading ? "Connecting…" : "Connect"}
            </a>
          )}
        </div>

        {/* Messaging platforms */}
        {platforms.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{p.icon}</span>
              <span className="text-slate-300">{p.name}</span>
              <span className="text-slate-600 text-xs">● Not connected</span>
            </div>
            <span className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-500 cursor-not-allowed">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
