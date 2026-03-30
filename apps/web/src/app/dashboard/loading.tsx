export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Hero skeleton */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-slate-800" />
            <div className="space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800/60" />
            </div>
          </div>
          <div className="h-4 w-64 animate-pulse rounded bg-slate-800/60" />
        </div>

        {/* Quick actions skeleton */}
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-36 animate-pulse rounded-full bg-slate-800" />
          ))}
        </div>

        {/* Three-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Connections */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-800 mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-pulse rounded bg-slate-800" />
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-800/60" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded-md bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: AI Model + Usage */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="h-5 w-20 animate-pulse rounded bg-slate-800 mb-3" />
              <div className="h-4 w-48 animate-pulse rounded bg-slate-800/60 mb-3" />
              <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-800" />
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="h-5 w-28 animate-pulse rounded bg-slate-800 mb-4" />
              <div className="mb-4">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-800/60 mb-2" />
                <div className="h-7 w-20 animate-pulse rounded bg-slate-800 mb-2" />
                <div className="h-2 w-full animate-pulse rounded-full bg-slate-800" />
              </div>
              <div className="mb-4">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-800/60 mb-2" />
                <div className="h-7 w-20 animate-pulse rounded bg-slate-800 mb-2" />
                <div className="h-2 w-full animate-pulse rounded-full bg-slate-800" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800/60" />
            </div>
          </div>

          {/* Col 3: Plan */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-800 mb-3" />
            <div className="h-7 w-16 animate-pulse rounded bg-slate-800 mb-4" />
            <div className="space-y-2 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 w-36 animate-pulse rounded bg-slate-800/60" />
              ))}
            </div>
            <div className="h-9 w-full animate-pulse rounded-lg bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
