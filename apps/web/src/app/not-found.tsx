import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-xl backdrop-blur">
        <div className="mb-4 text-5xl">🔍</div>
        <h1 className="mb-2 text-xl font-semibold text-zinc-100">Page not found</h1>
        <p className="mb-6 text-sm text-zinc-400">
          We looked everywhere, but this page doesn't seem to exist.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Go to dashboard
          </Link>
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-200">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
