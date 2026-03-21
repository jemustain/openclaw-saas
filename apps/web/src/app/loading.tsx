export default function Loading() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-indigo-500" />
      <p className="text-sm text-zinc-400">Loading...</p>
    </div>
  );
}
