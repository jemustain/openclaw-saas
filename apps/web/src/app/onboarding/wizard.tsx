'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles, Cloud, Server, CreditCard, MessageSquare,
  Zap, ArrowRight, ArrowLeft, Check, Loader2,
  Home, Share2, Briefcase, Code, Gamepad2,
  MessageCircle, Send, Hash, Slack, Shield,
} from 'lucide-react';

const STEPS = ['Welcome', 'Hosting', 'Plan', 'Messengers', 'Skills', 'Setting Up', 'Ready'];

const MESSENGERS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'discord', label: 'Discord', icon: Hash },
  { id: 'slack', label: 'Slack', icon: Slack },
  { id: 'signal', label: 'Signal', icon: Shield },
];

const SKILLS = [
  { id: 'smart-home', label: 'Smart Home', icon: Home },
  { id: 'social-media', label: 'Social Media', icon: Share2 },
  { id: 'productivity', label: 'Productivity', icon: Briefcase },
  { id: 'developer-tools', label: 'Developer Tools', icon: Code },
  { id: 'entertainment', label: 'Entertainment', icon: Gamepad2 },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [hosting, setHosting] = useState('digitalocean');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [windowStart, setWindowStart] = useState(9);
  const [messengers, setMessengers] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [setupStatus, setSetupStatus] = useState<string[]>([]);
  const [setupDone, setSetupDone] = useState(false);

  // Init from URL params and timezone
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

    const stepParam = searchParams.get('step');
    const connected = searchParams.get('connected');
    const upgraded = searchParams.get('upgraded');

    if (stepParam) {
      const s = parseInt(stepParam, 10);
      if (s >= 0 && s < STEPS.length) setStep(s);
    }
    if (connected === 'digitalocean' && !stepParam) setStep(2);
    if (upgraded === 'true' && !stepParam) {
      setPlan('pro');
      setStep(3);
      // Pre-check all messengers and skills for pro
      setMessengers(MESSENGERS.map((m) => m.id));
      setSkills(SKILLS.map((s) => s.id));
    }
  }, [searchParams]);

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? 1 : -1);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 200);
  }, [step]);

  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);

  // When plan changes to pro, pre-select all
  const selectPlan = (p: 'free' | 'pro') => {
    setPlan(p);
    if (p === 'pro') {
      setMessengers(MESSENGERS.map((m) => m.id));
      setSkills(SKILLS.map((s) => s.id));
    } else {
      setMessengers([]);
      setSkills([]);
    }
  };

  const toggleMessenger = (id: string) => {
    if (plan === 'free') {
      setMessengers([id]);
    } else {
      setMessengers((prev) =>
        prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
      );
    }
  };

  const toggleSkill = (id: string) => {
    if (plan === 'free') {
      setSkills((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id);
        if (prev.length >= 2) return prev;
        return [...prev, id];
      });
    } else {
      setSkills((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    }
  };

  // Save and launch
  const saveAndLaunch = async () => {
    goTo(5);
    const statuses: string[] = [];
    const addStatus = (s: string) => {
      statuses.push(s);
      setSetupStatus([...statuses]);
    };

    addStatus('Saving your preferences...');
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, plan, windowStart, messengers, skills, onboardingComplete: false }),
      });
      addStatus('Preferences saved');
    } catch {
      addStatus('Warning: Could not save preferences');
    }

    addStatus('Launching your assistant...');
    try {
      await fetch('/api/launch', { method: 'POST' });
      addStatus('Assistant launched');
    } catch {
      addStatus('Warning: Launch request failed');
    }

    addStatus('Waiting for assistant to come online...');
    let attempts = 0;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch('/api/assistant/status');
        const data = await res.json();
        if (data.status === 'active') {
          addStatus('Assistant is active!');
          // Mark onboarding complete
          await fetch('/api/onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onboardingComplete: true }),
          });
          setSetupDone(true);
          setTimeout(() => goTo(6), 1000);
          return;
        }
      } catch { /* ignore */ }
      attempts++;
      if (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        return poll();
      }
      addStatus('Taking longer than expected — check your dashboard');
      setSetupDone(true);
      setTimeout(() => goTo(6), 1000);
    };
    await poll();
  };

  const Card = ({ selected, disabled, onClick, children }: {
    selected?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative p-5 rounded-xl border-2 text-left transition-all ${
        disabled
          ? 'border-slate-700 bg-slate-900/50 opacity-70 cursor-not-allowed'
          : selected
            ? 'border-violet-600 bg-slate-900 shadow-lg shadow-violet-600/10'
            : 'border-slate-800 bg-slate-900 hover:border-slate-700 cursor-pointer'
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      {children}
    </button>
  );

  const PrimaryBtn = ({ onClick, disabled, children }: {
    onClick?: () => void; disabled?: boolean; children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
    >
      {children}
    </button>
  );

  const BackBtn = () => (
    <button type="button" onClick={back} className="px-4 py-3 text-slate-400 hover:text-white transition-colors flex items-center gap-1">
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === step ? 'bg-violet-600' : i < step ? 'bg-violet-600/50' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      <div
        className={`w-full max-w-2xl transition-all duration-200 ${
          animating ? 'opacity-0 translate-x-' + (direction > 0 ? '4' : '-4') : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6">
            <Sparkles className="w-16 h-16 text-violet-500 mx-auto" />
            <h1 className="text-4xl font-bold">Welcome to ShiftWorker AI!</h1>
            <p className="text-slate-400 text-lg">Your personal AI assistant that works while you sleep, play, or live your life.</p>
            <p className="text-sm text-slate-500">Detected timezone: {timezone || '...'}</p>
            <PrimaryBtn onClick={next}>
              Let&apos;s go <ArrowRight className="w-4 h-4" />
            </PrimaryBtn>
          </div>
        )}

        {/* Step 1: Hosting */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your Hosting</h2>
            <p className="text-slate-400 text-center">Where should your AI assistant run?</p>
            <div className="grid gap-4">
              <Card selected={hosting === 'digitalocean'} onClick={() => setHosting('digitalocean')}>
                <div className="flex items-center gap-3">
                  <Cloud className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="font-semibold">DigitalOcean</div>
                    <div className="text-sm text-slate-400">Reliable cloud hosting, starting at $4/mo</div>
                  </div>
                </div>
              </Card>
              <Card disabled>
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-blue-300" />
                  <div>
                    <div className="font-semibold">Azure <span className="text-xs text-slate-400 ml-2">Coming soon</span></div>
                    <div className="text-sm text-slate-400">Microsoft Azure cloud</div>
                  </div>
                </div>
              </Card>
              <Card disabled>
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-orange-300" />
                  <div>
                    <div className="font-semibold">AWS <span className="text-xs text-slate-400 ml-2">Coming soon</span></div>
                    <div className="text-sm text-slate-400">Amazon Web Services</div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={() => {
                window.location.href = '/api/auth/digitalocean';
              }}>
                Connect DigitalOcean <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
            <p className="text-xs text-slate-500 text-center">
              New to DigitalOcean?{' '}
              <a
                href="https://cloud.digitalocean.com/account-referrals?i=091ab6c0-097d-4111-baab-ee4872bd796d"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:underline"
              >
                Sign up with our referral link
              </a>{' '}
              for free credits.
            </p>
          </div>
        )}

        {/* Step 2: Plan */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your Plan</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card selected={plan === 'free'} onClick={() => selectPlan('free')}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-green-400" />
                    <span className="font-semibold text-lg">Free</span>
                  </div>
                  <div className="text-3xl font-bold">$0<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                  <p className="text-sm text-slate-400">8-hour daily window</p>
                  {plan === 'free' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="text-xs text-slate-400">Start hour ({timezone})</label>
                      <select
                        value={windowStart}
                        onChange={(e) => setWindowStart(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </Card>
              <Card selected={plan === 'pro'} onClick={() => selectPlan('pro')}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-violet-400" />
                    <span className="font-semibold text-lg">Pro</span>
                  </div>
                  <div className="text-3xl font-bold">$12<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                  <p className="text-sm text-slate-400">24/7 availability, all messengers, all skills</p>
                </div>
              </Card>
            </div>
            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={() => {
                if (plan === 'pro') {
                  window.location.href = '/api/stripe/checkout';
                } else {
                  next();
                }
              }}>
                {plan === 'pro' ? 'Subscribe' : 'Next'} <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 3: Messengers */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your Messenger{plan === 'free' ? '' : 's'}</h2>
            <p className="text-slate-400 text-center">
              {plan === 'free' ? 'Pick one messenger for your assistant.' : 'All messengers are included with Pro.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {MESSENGERS.map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.id} selected={messengers.includes(m.id)} onClick={() => toggleMessenger(m.id)}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-violet-400" />
                      <span className="font-medium">{m.label}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={next} disabled={messengers.length === 0}>
                Next <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 4: Skills */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your Skills</h2>
            <p className="text-slate-400 text-center">
              {plan === 'free' ? 'Pick up to 2 skills.' : 'All skills are included with Pro.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {SKILLS.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.id} selected={skills.includes(s.id)} onClick={() => toggleSkill(s.id)}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-violet-400" />
                      <span className="font-medium">{s.label}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={saveAndLaunch} disabled={skills.length === 0}>
                Launch <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 5: Setting Up */}
        {step === 5 && (
          <div className="text-center space-y-6">
            <Loader2 className={`w-16 h-16 text-violet-500 mx-auto ${setupDone ? '' : 'animate-spin'}`} />
            <h2 className="text-2xl font-bold">Setting Up Your Assistant</h2>
            <div className="space-y-2 text-left max-w-md mx-auto">
              {setupStatus.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Ready */}
        {step === 6 && (
          <div className="text-center space-y-6">
            <Sparkles className="w-16 h-16 text-violet-500 mx-auto" />
            <h1 className="text-3xl font-bold">You&apos;re All Set!</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left space-y-3 max-w-md mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Hosting</span>
                <span>DigitalOcean</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Plan</span>
                <span className="capitalize">{plan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Timezone</span>
                <span>{timezone}</span>
              </div>
              {plan === 'free' && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Active window</span>
                  <span>{windowStart === 0 ? '12 AM' : windowStart < 12 ? `${windowStart} AM` : windowStart === 12 ? '12 PM' : `${windowStart - 12} PM`} - {(() => { const e = (windowStart + 8) % 24; return e === 0 ? '12 AM' : e < 12 ? `${e} AM` : e === 12 ? '12 PM' : `${e - 12} PM`; })()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Messengers</span>
                <span>{messengers.map((m) => MESSENGERS.find((x) => x.id === m)?.label).join(', ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Skills</span>
                <span>{skills.map((s) => SKILLS.find((x) => x.id === s)?.label).join(', ')}</span>
              </div>
            </div>
            <PrimaryBtn onClick={() => router.push('/dashboard')}>
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </PrimaryBtn>
          </div>
        )}
      </div>
    </div>
  );
}
