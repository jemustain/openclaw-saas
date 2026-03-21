"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/ui/error-card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <ErrorCard
      title="Something went wrong loading your dashboard"
      message="Your data is safe — this is just a hiccup. Give it another shot."
      onRetry={reset}
    />
  );
}
