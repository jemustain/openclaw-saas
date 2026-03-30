export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="h-5 w-20 animate-pulse rounded bg-slate-800" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-800" />
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="h-5 w-20 animate-pulse rounded bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 animate-pulse rounded bg-slate-800" />
          <div className="h-10 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
