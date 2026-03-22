import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LaunchButton } from './launch-button';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Welcome aboard! 👋
          </h1>
          <p className="text-lg text-slate-300">
            We&apos;re about to set up your personal AI assistant.
            This takes about 60 seconds.
          </p>
          <p className="text-slate-400">
            Your assistant will live in its own private space — just for you.
          </p>
        </div>

        <Suspense fallback={
          <div className="h-14 bg-slate-800 rounded-xl animate-pulse" />
        }>
          <LaunchButton />
        </Suspense>
      </div>
    </div>
  );
}
