'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnsubscribeContent() {
  const params = useSearchParams();
  const status = params.get('status');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold mb-4">You&apos;ve been removed</h1>
            <p className="text-slate-400">
              Your email has been removed from the HandsOff waitlist. Sorry to see you go!
            </p>
          </>
        )}
        {status === 'invalid' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Invalid link</h1>
            <p className="text-slate-400">
              This unsubscribe link is invalid or has already been used.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-slate-400">
              We couldn&apos;t process your request. Please try again or contact us.
            </p>
          </>
        )}
        {!status && (
          <>
            <h1 className="text-2xl font-bold mb-4">Unsubscribe</h1>
            <p className="text-slate-400">Use the link from your email to unsubscribe.</p>
          </>
        )}
        <a
          href="/"
          className="inline-block mt-8 text-violet-400 hover:text-violet-300 transition"
        >
          ← Back to HandsOff
        </a>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
