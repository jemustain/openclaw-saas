'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/skills', label: 'Skills' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/billing', label: 'Billing' },
];

interface DashboardNavProps {
  userName?: string;
  plan?: string;
}

export function DashboardNav({ userName = 'User', plan = 'Free' }: DashboardNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const planColor = plan === 'Pro' ? 'bg-violet-600' : plan === 'Starter' ? 'bg-blue-600' : 'bg-slate-700';

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3">
        <span className="text-white font-semibold">ShiftWorker</span>
        <button onClick={() => setOpen(!open)} className="text-slate-300 hover:text-white" aria-label="Toggle nav">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col
        transform transition-transform lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex items-center gap-2 px-6 py-5 border-b border-slate-800">
          <Link href="/" className="text-lg font-bold text-white">ShiftWorker</Link>
        </div>

        <div className="px-4 py-4 border-b border-slate-800">
          <p className="text-sm text-white font-medium truncate">{userName}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full text-white ${planColor}`}>
            {plan}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                isActive(href)
                  ? 'bg-violet-600/20 text-violet-300 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
