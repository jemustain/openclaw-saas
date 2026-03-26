'use client';

import { useState, FormEvent } from 'react';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      } else {
        setStatus('success');
        setMessage(data.message || "You're on the list! We'll keep you posted.");
        setEmail('');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-full bg-violet-500/10 border border-violet-500/30 px-6 py-3 text-violet-300 font-medium">
        ✓ {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
          placeholder="your@email.com"
          required
          className="w-full rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full sm:w-auto rounded-full bg-violet-600 px-8 py-3 font-medium hover:bg-violet-500 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Subscribing...' : 'Get Updates'}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-red-400 text-sm mt-3">{message}</p>
      )}
    </form>
  );
}
