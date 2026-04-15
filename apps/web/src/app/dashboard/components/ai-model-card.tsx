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
  assistantActive = false,
}: {
  provider?: string | null;
  apiKey?: string | null;
  disabled?: boolean;
  assistantActive?: boolean;
}) {
  const configured = !!provider && !!apiKey;
  // Only show "expired" if the provider is set, key is missing, AND the assistant isn't actively working
  const providerKnown = !!provider && !apiKey && !assistantActive;
  // If provider is set and assistant is active, treat as configured (token may be on sidecar)
  const effectivelyConfigured = configured || (!!provider && assistantActive);
  const label = provider ? PROVIDER_LABELS[provider] ?? provider : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white mb-1">AI Model</h2>

      {effectivelyConfigured ? (
        <>
          <p className="text-2xl font-bold text-indigo-400 mb-2">{label}</p>
          {apiKey ? (
            <p className="text-sm text-slate-400 mb-4 font-mono truncate">
              Key: {maskKey(apiKey!)}
            </p>
          ) : (
            <p className="text-sm text-green-400 mb-4">
              Connected and working
            </p>
          )}
        </>
      ) : providerKnown ? (
        <>
          <p className="text-2xl font-bold text-indigo-400 mb-2">{label}</p>
          <p className="text-sm text-amber-400 mb-4">
            Token expired or missing. Please reconnect.
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
          {effectivelyConfigured ? "Change" : providerKnown ? "Reconnect" : "Set up AI provider"}
        </span>
      ) : (
        <Link
          href="/dashboard/settings?section=ai"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
        >
          {effectivelyConfigured ? "Change" : providerKnown ? "Reconnect" : "Set up AI provider"}
        </Link>
      )}
    </div>
  );
}
