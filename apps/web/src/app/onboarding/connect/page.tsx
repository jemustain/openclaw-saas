import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const APPS = [
  { name: 'WhatsApp', icon: '💬', description: 'Chat on WhatsApp' },
  { name: 'Telegram', icon: '✈️', description: 'Chat on Telegram' },
  { name: 'Signal', icon: '🔒', description: 'Chat on Signal' },
  { name: 'Discord', icon: '🎮', description: 'Chat on Discord' },
  { name: 'Slack', icon: '💼', description: 'Chat on Slack' },
];

export default async function ConnectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Connect a chat app
          </h1>
          <p className="text-slate-400">
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
