'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserInfo {
  email: string;
  name: string | null;
}

export function MainNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    router.push('/');
  }

  const initial = user?.name?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? '?';

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg sm:text-xl font-bold text-white">
          ShiftWorker
        </Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-4">
          {loaded && user ? (
            <>
              <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                Sign Out
              </button>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-medium">
                {initial}
              </div>
            </>
          ) : loaded ? (
            <>
              <Link href="/auth/signin" className="text-sm text-slate-300 hover:text-white transition">
                Sign In
              </Link>
              <Link
                href="/auth/signin"
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
              >
                Get Started Free
              </Link>
            </>
          ) : null}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-slate-300 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900 px-4 py-4 space-y-3">
          {loaded && user ? (
            <>
              <Link href="/dashboard" className="block text-sm text-slate-300 hover:text-white" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleSignOut} className="block text-sm text-slate-400 hover:text-white">
                Sign Out
              </button>
            </>
          ) : loaded ? (
            <>
              <Link href="/auth/signin" className="block text-sm text-slate-300 hover:text-white" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              <Link href="/auth/signin" className="block text-sm text-violet-400 hover:text-violet-300" onClick={() => setMenuOpen(false)}>
                Get Started Free
              </Link>
            </>
          ) : null}
        </div>
      )}
    </nav>
  );
}
