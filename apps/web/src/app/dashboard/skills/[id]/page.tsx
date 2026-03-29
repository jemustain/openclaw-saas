"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSkillById, TIER_LABELS, type SkillTier } from "@/lib/skills/catalog";

const TIER_COLORS: Record<SkillTier, string> = {
  free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function SkillDetailPage() {
  const params = useParams();
  const skill = getSkillById(params.id as string);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userTier: SkillTier = "free";

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (!res.ok) return;
      const data = await res.json();
      const names = new Set<string>(
        (data.skills || []).map((s: { name: string }) => s.name),
      );
      setInstalled(names.has(params.id as string));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleToggle() {
    if (actionInProgress || !skill) return;

    const action = installed ? "remove" : "install";
    setActionInProgress(true);
    setError(null);

    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} skill`);
      }

      setInstalled(action === "install");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionInProgress(false);
    }
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4"></p>
          <p className="text-gray-400 mb-4">Skill not found</p>
          <Link href="/dashboard/skills" className="text-blue-400 hover:text-blue-300">
            ← Back to Skill Library
          </Link>
        </div>
      </div>
    );
  }

  const locked = skill.tier !== "free" && userTier === "free";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/skills"
        className="text-sm text-gray-500 hover:text-gray-300 mb-6 inline-block"
      >
        ← Back to Skill Library
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <span className="text-5xl">{skill.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{skill.name}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${TIER_COLORS[skill.tier]}`}
            >
              {TIER_LABELS[skill.tier]}
            </span>
            {skill.popular && <span className="text-xs text-amber-400">Popular</span>}
          </div>
          <p className="text-gray-400">{skill.description}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-300 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toggle / Upgrade */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
        {locked ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">
                This skill requires the {TIER_LABELS[skill.tier]} plan
              </p>
              <p className="text-sm text-gray-400">
                Upgrade your plan to enable this skill.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgrade
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            <span className="text-gray-400">Checking status...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">
                {installed ? "This skill is installed" : "Install this skill"}
              </p>
              <p className="text-sm text-gray-400">
                {installed
                  ? "Your assistant can now use this skill."
                  : "Install it to let your assistant use it."}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={actionInProgress}
              className="flex items-center gap-2"
              aria-label={`Toggle ${skill.name}`}
            >
              {actionInProgress ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                  <span className="text-sm text-gray-400">
                    {installed ? "Removing..." : "Installing..."}
                  </span>
                </div>
              ) : (
                <div
                  className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${
                    installed ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      installed ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Capabilities */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">What it can do</h2>
        <ul className="space-y-2">
          {skill.capabilities.map((cap, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-300">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>{cap}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Examples */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Try saying</h2>
        <div className="space-y-2">
          {skill.examples.map((ex, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-300 italic"
            >
              &ldquo;{ex}&rdquo;
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
