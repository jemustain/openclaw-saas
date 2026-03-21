import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ReadyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="text-6xl">🎉</div>
        <h1 className="text-4xl font-bold text-white">
          Your assistant is ready!
        </h1>
        <p className="text-lg text-slate-300">
          Say hi — connect your favorite chat app and start talking to your new assistant.
        </p>

        <div className="space-y-4">
          <Link
            href="/onboarding/connect"
            className="block w-full py-4 px-8 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-purple-600/20"
          >
            Connect a chat app 💬
          </Link>
          <Link
            href="/dashboard"
            className="block text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            Go to dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
