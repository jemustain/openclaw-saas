"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  SKILLS,
  CATEGORIES,
  TIER_LABELS,
  type SkillCategory,
  type SkillTier,
} from "@/lib/skills/catalog";

const TIER_COLORS: Record<SkillTier, string> = {
  free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SkillCategory | "All">("All");
  const [installedSkills, setInstalledSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // TODO: get from user session; for now assume free
  const userTier: SkillTier = "free";

  const fetchInstalled = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (!res.ok) throw new Error("Failed to fetch skills");
      const data = await res.json();
      const names = new Set<string>(
        (data.skills || []).map((s: { name: string }) => s.name),
      );
      setInstalledSkills(names);
    } catch {
      // Assistant might not be running — that's OK
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstalled();
  }, [fetchInstalled]);

  const filtered = useMemo(() => {
    return SKILLS.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, category]);

  async function toggleSkill(id: string, tier: SkillTier) {
    if (tier !== "free" && userTier === "free") return;
    if (actionInProgress) return;

    const isInstalled = installedSkills.has(id);
    const action = isInstalled ? "remove" : "install";

    setActionInProgress(id);
    setError(null);

    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} skill`);
      }

      setInstalledSkills((prev) => {
        const next = new Set(prev);
        if (action === "install") next.add(id);
        else next.delete(id);
        return next;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionInProgress(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Skill Library</h1>
        <p className="text-gray-400">
          Browse and enable skills to teach your assistant new tricks.
        </p>
      </div>

      {/* Error banner */}
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

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat as SkillCategory | "All")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-400">Loading skills...</span>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No skills match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => {
            const locked = skill.tier !== "free" && userTier === "free";
            const isInstalled = installedSkills.has(skill.id);
            const isBusy = actionInProgress === skill.id;

            return (
              <div
                key={skill.id}
                className="relative bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{skill.icon}</span>
                    <div>
                      <Link
                        href={`/dashboard/skills/${skill.id}`}
                        className="font-semibold text-gray-100 hover:text-blue-400 transition-colors"
                      >
                        {skill.name}
                      </Link>
                      {skill.popular && (
                        <span className="ml-2 text-xs text-amber-400">
                          ⭐ Popular
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[skill.tier]}`}
                  >
                    {TIER_LABELS[skill.tier]}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 leading-relaxed">
                  {skill.description}
                </p>

                {/* Toggle / Upgrade */}
                <div className="mt-auto pt-2">
                  {locked ? (
                    <Link
                      href="/dashboard/billing"
                      className="inline-block text-sm text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Upgrade to unlock →
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleSkill(skill.id, skill.tier)}
                      disabled={isBusy}
                      className="flex items-center gap-2 text-sm disabled:opacity-50"
                      aria-label={`Toggle ${skill.name}`}
                    >
                      {isBusy ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                          <span className="text-gray-400">
                            {isInstalled ? "Removing..." : "Installing..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <div
                            className={`w-10 h-5 rounded-full relative transition-colors ${
                              isInstalled ? "bg-blue-600" : "bg-gray-700"
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                isInstalled
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </div>
                          <span className="text-gray-400">
                            {isInstalled ? "Installed" : "Not installed"}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
