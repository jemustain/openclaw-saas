'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  'Creating your private cloud space...',
  'Installing your AI assistant...',
  'Almost ready...',
];

export function LaunchButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'launching' | 'error'>('idle');
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const launch = useCallback(async () => {
    setState('launching');
    setStep(0);
    setErrorMsg('');

    try {
      const res = await fetch('/api/launch', { method: 'POST' });
      if (!res.ok) throw new Error('Launch failed');
    } catch {
      setState('error');
      setErrorMsg('Something went wrong. Let\u2019s try that again.');
      return;
    }

    // Start polling
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/assistant/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'active') {
          clearInterval(poll);
          router.push('/onboarding/ready');
        }
      } catch {
        // keep polling
      }
    }, 3000);

    // Animate steps
    const stepTimer1 = setTimeout(() => setStep(1), 5000);
    const stepTimer2 = setTimeout(() => setStep(2), 12000);

    // Timeout after 90s
    const timeout = setTimeout(() => {
      clearInterval(poll);
      setState('error');
      setErrorMsg('This is taking longer than expected. Let\u2019s try again.');
    }, 90000);

    return () => {
      clearInterval(poll);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(timeout);
    };
  }, [router]);

  if (state === 'idle') {
    return (
      <button
        onClick={launch}
        className="w-full py-4 px-8 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-purple-600/20"
      >
        Launch my assistant 🚀
      </button>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-4">
        <p className="text-red-400">{errorMsg}</p>
        <button
          onClick={launch}
          className="w-full py-4 px-8 bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold rounded-xl transition-colors duration-200"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="h-8 w-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-lg text-white font-medium">
        Setting up your assistant<span className="animate-pulse">...</span>
      </p>
      <div className="space-y-3">
        {STEPS.map((text, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 transition-opacity duration-500 ${
              i <= step ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <span className={`text-sm ${
              i < step ? 'text-green-400' : i === step ? 'text-purple-400' : 'text-slate-500'
            }`}>
              {i < step ? '✓' : i === step ? '●' : '○'}
            </span>
            <span className={`text-sm ${
              i <= step ? 'text-slate-200' : 'text-slate-500'
            }`}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
