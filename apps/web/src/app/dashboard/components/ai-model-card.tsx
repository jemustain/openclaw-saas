"use client";

import Link from "next/link";

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  "github-copilot": "GitHub Copilot",
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••" + key.slice(-4);
}

export function AiModelCard({
  provider,
  apiKey,
  disabled = false,
}: {
  provider?: string | null;
  apiKey?: string | null;
  disabled?: boolean;
}) {
  const configured = !!provider && !!apiKey;
  const label = provider ? PROVIDER_LABELS[provider] ?? provider : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-1">AI Model</h2>

      {configured ? (
        <>
          <p className="text-2xl font-bold text-indigo-400 mb-2">{label}</p>
          <p className="text-sm text-slate-400 mb-4 font-mono">
            Key: {maskKey(apiKey!)}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-4">
            Not configured yet. Connect an AI provider so your assistant can
            think.
          </p>
        </>
      )}

      {disabled ? (
        <span className="inline-block rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-500 cursor-not-allowed">
          {configured ? "Change" : "Set up AI provider"}
        </span>
      ) : (
        <Link
          href="/settings/ai"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
        >
          {configured ? "Change" : "Set up AI provider"}
        </Link>
      )}
    </div>
  );
}
