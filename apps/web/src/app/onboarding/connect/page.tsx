import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProviderToken } from '@/lib/providers/token-store';
import Link from 'next/link';

const APPS = [
  { name: 'WhatsApp', icon: '💬', description: 'Chat on WhatsApp' },
  { name: 'Telegram', icon: '✈️', description: 'Chat on Telegram' },
  { name: 'Signal', icon: '🔒', description: 'Chat on Signal' },
  { name: 'Discord', icon: '🎮', description: 'Chat on Discord' },
  { name: 'Slack', icon: '💼', description: 'Chat on Slack' },
];

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const supabase: any = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const params = await searchParams;
  const doToken = await getProviderToken(user.id, 'digitalocean');
  const isConnected = !!doToken || params.connected === 'digitalocean';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-8">
        {/* Step 1: Connect Cloud */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Connect your cloud
          </h1>
          <p className="text-slate-400">
            We&apos;ll set up your assistant on your own DigitalOcean account. You pay them directly (~$6/mo).
          </p>
        </div>

        <div className="space-y-3">
          {/* Referral callout */}
          {!isConnected && (
            <div className="p-4 bg-blue-950/50 rounded-xl border border-blue-800/50 text-center space-y-2">
              <p className="text-blue-200 font-medium">
                Don&apos;t have a DigitalOcean account?
              </p>
              <a
                href="https://cloud.digitalocean.com/account-referrals?i=091ab6c0-097d-4111-baab-ee4872bd796d"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 transition-colors"
              >
                Sign up and get $200 in free credits →
              </a>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌊</span>
              <div>
                <p className="text-white font-medium">DigitalOcean</p>
                <p className="text-slate-500 text-sm">
                  {isConnected ? 'Account connected' : 'Connect your cloud account'}
                </p>
              </div>
            </div>
            {isConnected ? (
              <span className="px-4 py-2 bg-green-900/50 text-green-400 text-sm rounded-lg">
                ✓ Connected
              </span>
            ) : (
              <a
                href="/api/auth/digitalocean"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
              >
                Connect DigitalOcean
              </a>
            )}
          </div>

          {params.error && (
            <p className="text-red-400 text-sm text-center">
              Failed to connect. Please try again.
            </p>
          )}
        </div>

        {/* Step 2: Connect Chat App */}
        <div className="text-center space-y-3 pt-4">
          <h2 className="text-xl font-semibold text-white">
            Connect a chat app
          </h2>
          <p className="text-slate-400 text-sm">
            Pick your favorite way to talk to your assistant.
          </p>
        </div>

        <div className="space-y-3">
          {APPS.map((app) => (
            <div
              key={app.name}
              className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{app.icon}</span>
                <div>
                  <p className="text-white font-medium">{app.name}</p>
                  <p className="text-slate-500 text-sm">{app.description}</p>
                </div>
              </div>
              <button
                disabled
                className="px-4 py-2 bg-slate-800 text-slate-500 text-sm rounded-lg cursor-not-allowed"
              >
                Coming soon
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            Skip for now →
          </Link>
        </div>
      </div>
    </div>
  );
}
