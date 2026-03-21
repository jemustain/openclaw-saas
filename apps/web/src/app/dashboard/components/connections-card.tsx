import Link from "next/link";

const platforms = [
  { name: "WhatsApp", icon: "💬" },
  { name: "Telegram", icon: "✈️" },
  { name: "Slack", icon: "🔧" },
  { name: "Discord", icon: "🎮" },
];

export function ConnectionsCard() {
  // MVP: all platforms show as not connected
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Connections</h2>

      <div className="space-y-3">
        {platforms.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{p.icon}</span>
              <span className="text-slate-300">{p.name}</span>
              <span className="text-slate-600 text-xs">● Not connected</span>
            </div>
            <Link
              href="/onboarding/connect"
              className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              Connect
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
