export default function BillingLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="h-8 w-24 animate-pulse rounded bg-slate-800" />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-slate-800" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-48 animate-pulse rounded bg-slate-800/60" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-800" />
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
        <div className="h-5 w-24 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-800/60" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800/60" />
      </div>
    </div>
  );
}
