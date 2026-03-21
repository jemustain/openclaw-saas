'use client';

import { createClient } from '../../../../lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push(redirect);
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">Sign in to OpenClaw</h1>
        <button onClick={handleGoogleLogin} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white hover:bg-gray-800 transition">Continue with Google</button>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700" /></div><div className="relative flex justify-center text-xs"><span className="bg-gray-950 px-2 text-gray-400">or</span></div></div>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="text-center text-sm text-gray-400">Don&apos;t have an account?{' '}<a href="/auth/signup" className="text-blue-400 hover:underline">Sign up</a></p>
      </div>
    </main>
  );
}
