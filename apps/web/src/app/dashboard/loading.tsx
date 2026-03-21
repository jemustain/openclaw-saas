export default function DashboardLoading() {
  return (
    <div className="p-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-zinc-800" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
          >
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800/60" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/60" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
