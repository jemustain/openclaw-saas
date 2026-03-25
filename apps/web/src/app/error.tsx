"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/ui/error-card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <ErrorCard
      title="Oops, something went wrong"
      message="Don't worry — it's not you. Let's try that again."
      onRetry={reset}
    />
  );
}
