"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Onboarding error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-xl backdrop-blur">
        <div className="mb-4 text-4xl">🔧</div>
        <h1 className="mb-2 text-xl font-semibold text-zinc-100">
          We hit a snag setting things up
        </h1>
        <p className="mb-6 text-sm text-zinc-400">
          No worries — these things happen. You can try again or reach out if it
          keeps happening.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Try again
          </button>
          <a
            href="mailto:support@openclaw.dev"
            className="text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            Contact support
          </a>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
