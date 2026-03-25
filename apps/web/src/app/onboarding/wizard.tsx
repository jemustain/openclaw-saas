'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles, Cloud, Server, CreditCard, MessageSquare,
  Zap, ArrowRight, ArrowLeft, Check, Loader2,
  Home, Share2, Briefcase, Code, Gamepad2,
  MessageCircle, Send, Hash, Slack, Shield,
  Mail, Globe, Bell, FileText, Sun, Lock,
  ShoppingCart, Plane, DollarSign, CalendarDays,
  QrCode, Bot, Smartphone,
} from 'lucide-react';

const STEPS = ['Welcome', 'Hosting', 'Server Size', 'Plan', 'Messengers', 'Skills', 'Setup & Connect', 'Ready'];

const AZURE_SIZES = [
  { id: 'Standard_B1s', label: 'Basic', cpu: '1 vCPU', ram: '1 GB', price: '~$4/mo', recommended: true },
  { id: 'Standard_B1ms', label: 'Standard', cpu: '1 vCPU', ram: '2 GB', price: '~$15/mo', recommended: false },
  { id: 'Standard_B2s', label: 'Performance', cpu: '2 vCPU', ram: '4 GB', price: '~$30/mo', recommended: false },
  { id: 'Standard_B2ms', label: 'Power', cpu: '2 vCPU', ram: '8 GB', price: '~$60/mo', recommended: false },
];

const DO_SIZES = [
  { id: 's-1vcpu-1gb', label: 'Basic', cpu: '1 vCPU', ram: '1 GB', price: '~$6/mo', recommended: true },
  { id: 's-1vcpu-2gb', label: 'Standard', cpu: '1 vCPU', ram: '2 GB', price: '~$12/mo', recommended: false },
  { id: 's-2vcpu-2gb', label: 'Performance', cpu: '2 vCPU', ram: '2 GB', price: '~$18/mo', recommended: false },
  { id: 's-2vcpu-4gb', label: 'Power', cpu: '2 vCPU', ram: '4 GB', price: '~$24/mo', recommended: false },
];

const MESSENGERS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'discord', label: 'Discord', icon: Hash },
  { id: 'slack', label: 'Slack', icon: Slack },
  { id: 'signal', label: 'Signal', icon: Shield },
];

type SkillDef = {
  id: string;
  label: string;
  description: string;
  icon: typeof Mail;
  category: string;
  pro: boolean;
};

const SKILL_CATEGORIES = ['Communication', 'Productivity', 'Research', 'Social Media', 'Smart Home'];

const SKILLS: SkillDef[] = [
  // Free
  { id: 'email-triage', label: 'Email Triage', description: 'Reads your inbox, flags important messages, drafts replies', icon: Mail, category: 'Communication', pro: false },
  { id: 'calendar-mgmt', label: 'Calendar Management', description: 'Books meetings, resolves conflicts, sends reminders', icon: CalendarDays, category: 'Productivity', pro: false },
  { id: 'web-research', label: 'Web Research', description: 'Searches the web, reads pages, summarizes findings', icon: Globe, category: 'Research', pro: false },
  { id: 'reminders-tasks', label: 'Reminders & Tasks', description: 'Tracks to-dos, sets reminders, follows up', icon: Bell, category: 'Productivity', pro: false },
  { id: 'documents-writing', label: 'Documents & Writing', description: 'Writes, edits, and organizes documents', icon: FileText, category: 'Productivity', pro: false },
  { id: 'weather-news', label: 'Weather & News', description: 'Daily briefings on weather and headlines', icon: Sun, category: 'Research', pro: false },
  // Pro
  { id: 'social-media', label: 'Social Media', description: 'Drafts posts, schedules content, monitors mentions', icon: Share2, category: 'Social Media', pro: true },
  { id: 'smart-home', label: 'Smart Home', description: 'Controls lights, cameras, and IoT devices', icon: Home, category: 'Smart Home', pro: true },
  { id: 'code-assistant', label: 'Code Assistant', description: 'Reviews PRs, writes scripts, debugs issues', icon: Code, category: 'Productivity', pro: true },
  { id: 'shopping-deals', label: 'Shopping & Deals', description: 'Tracks prices, finds deals, manages wishlists', icon: ShoppingCart, category: 'Research', pro: true },
  { id: 'travel-planning', label: 'Travel Planning', description: 'Books flights, hotels, builds itineraries', icon: Plane, category: 'Productivity', pro: true },
  { id: 'finance-tracking', label: 'Finance Tracking', description: 'Monitors accounts, categorizes spending, alerts on unusual activity', icon: DollarSign, category: 'Smart Home', pro: true },
];

const FREE_SKILLS = SKILLS.filter((s) => !s.pro);
const PRO_SKILLS = SKILLS.filter((s) => s.pro);

type MessengerSetupStatus = 'pending' | 'ready' | 'connected';

const MESSENGER_SETUP_INFO: Record<string, { title: string; pendingMsg: string; readyMsg: string; icon: typeof QrCode }> = {
  whatsapp: {
    title: 'WhatsApp',
    pendingMsg: 'Your server is starting up — QR code will appear here shortly.',
    readyMsg: 'Ready to connect! Scan the QR code below with WhatsApp to link your assistant.',
    icon: QrCode,
  },
  telegram: {
    title: 'Telegram',
    pendingMsg: 'Your server is starting up — connection setup will appear here shortly.',
    readyMsg: 'Ready to connect! Open Telegram, search @BotFather, send /newbot, and paste the token below.',
    icon: Bot,
  },
  discord: {
    title: 'Discord',
    pendingMsg: 'Your server is starting up — bot invite link will appear here shortly.',
    readyMsg: 'Ready to connect! Click the invite link to add your bot to a Discord server.',
    icon: Hash,
  },
  slack: {
    title: 'Slack',
    pendingMsg: 'Your server is starting up — workspace connection will appear here shortly.',
    readyMsg: 'Ready to connect! Click below to install the ShiftWorker app to your Slack workspace.',
    icon: Slack,
  },
  signal: {
    title: 'Signal',
    pendingMsg: 'Your server is starting up — connection setup will appear here shortly.',
    readyMsg: 'Ready to connect! Follow the instructions below to link Signal.',
    icon: Smartphone,
  },
};

function getSizesForHosting(hosting: string) {
  if (hosting === 'azure') return AZURE_SIZES;
  if (hosting === 'digitalocean') return DO_SIZES;
  return [];
}

function getDefaultSize(hosting: string) {
  const sizes = getSizesForHosting(hosting);
  return sizes.length > 0 ? sizes[0].id : '';
}

function getSizeLabel(hosting: string, sizeId: string) {
  const sizes = getSizesForHosting(hosting);
  const size = sizes.find((s) => s.id === sizeId);
  if (!size) return sizeId;
  return `${size.label} (${size.cpu}, ${size.ram})`;
}

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [hosting, setHosting] = useState('oracle');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [vmSize, setVmSize] = useState('');
  const [windowStart, setWindowStart] = useState(9);
  const [messengers, setMessengers] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [setupStatus, setSetupStatus] = useState<string[]>([]);
  const [setupDone, setSetupDone] = useState(false);
  const [serverActive, setServerActive] = useState(false);
  const [proTooltip, setProTooltip] = useState<string | null>(null);

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
    if (connected === 'digitalocean' || connected === 'azure') {
      setHosting(connected);
      if (!stepParam) setStep(2); // Go to Server Size step
    }
    if (upgraded === 'true' && !stepParam) {
      setPlan('pro');
      setStep(4);
      setMessengers(MESSENGERS.map((m) => m.id));
      setSkills(SKILLS.filter((s) => !s.pro).map((s) => s.id));
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

  const next = () => {
    let nextStep = step + 1;
    // Skip Server Size step for Oracle
    if (nextStep === 2 && hosting === 'oracle') nextStep = 3;
    goTo(nextStep);
  };

  const back = () => {
    let prevStep = step - 1;
    // Skip Server Size step for Oracle
    if (prevStep === 2 && hosting === 'oracle') prevStep = 1;
    goTo(prevStep);
  };

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
    const skill = SKILLS.find((s) => s.id === id);
    if (!skill) return;

    // Pro skills require pro plan
    if (skill.pro && plan !== 'pro') {
      setProTooltip(id);
      setTimeout(() => setProTooltip(null), 2000);
      return;
    }

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

  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Timer for setup step
  useEffect(() => {
    if (step !== 6 || setupDone) return;
    const interval = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [step, setupDone]);

  const saveAndLaunch = async () => {
    goTo(6);
    setServerActive(false);
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
        body: JSON.stringify({ timezone, hosting, plan, vmSize, windowStart, messengers, skills, onboardingComplete: false }),
      });
      addStatus('Preferences saved');
    } catch {
      addStatus('Warning: Could not save preferences');
    }

    addStatus('Launching your assistant...');
    let launchFailed = false;
    try {
      const launchRes = await fetch('/api/launch', { method: 'POST' });
      if (!launchRes.ok) {
        const errData = await launchRes.json().catch(() => ({}));
        addStatus(`⚠️ ${errData.error ?? 'Launch failed — please check your hosting account'}`);
        launchFailed = true;
      } else {
        addStatus('Assistant launched');
      }
    } catch {
      addStatus('⚠️ Launch request failed — check your connection');
      launchFailed = true;
    }

    if (launchFailed) {
      setSetupDone(true);
      setTimeout(() => goTo(7), 2000);
      return;
    }

    const providerName = hosting === 'oracle' ? 'Oracle Cloud' : hosting === 'azure' ? 'Azure' : 'DigitalOcean';
    addStatus('Provisioning your server — this usually takes 2–4 minutes...');
    let attempts = 0;
    const milestones = [
      { at: 15, msg: `Creating your server on ${providerName}...` },
      { at: 30, msg: 'Installing OpenClaw and dependencies...' },
      { at: 60, msg: 'Configuring your assistant...' },
      { at: 90, msg: 'Almost there — starting services...' },
    ];
    let nextMilestone = 0;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch('/api/assistant/status');
        const data = await res.json();
        if (data.assistant?.status === 'active') {
          addStatus('✅ Assistant is online!');
          setServerActive(true);
          await fetch('/api/onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onboardingComplete: true }),
          });
          setSetupDone(true);
          setTimeout(() => goTo(7), 2000);
          return;
        }
        if (data.assistant?.status === 'destroyed' || data.assistant?.status === 'destroying') {
          addStatus('⚠️ Server provisioning failed — please try again from your dashboard');
          setSetupDone(true);
          setTimeout(() => goTo(7), 2000);
          return;
        }
        // No assistant found at all after some attempts = likely failed
        if (!data.assistant && attempts > 10) {
          addStatus('⚠️ Something went wrong — please try launching from your dashboard');
          setSetupDone(true);
          setTimeout(() => goTo(7), 2000);
          return;
        }
      } catch { /* ignore */ }
      attempts++;
      const elapsed = attempts * 3;
      while (nextMilestone < milestones.length && elapsed >= milestones[nextMilestone].at) {
        addStatus(milestones[nextMilestone].msg);
        nextMilestone++;
      }
      if (attempts < 80) {
        await new Promise((r) => setTimeout(r, 3000));
        return poll();
      }
      addStatus('Taking longer than expected — you can check progress on your dashboard');
      setSetupDone(true);
      setTimeout(() => goTo(7), 1000);
    };
    await poll();
  };

  const Card = ({ selected, disabled, onClick, children, className: extraClass }: {
    selected?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode; className?: string;
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
      } ${extraClass || ''}`}
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

  // Skill card component
  const SkillCard = ({ skill }: { skill: SkillDef }) => {
    const Icon = skill.icon;
    const isSelected = skills.includes(skill.id);
    const isLocked = skill.pro && plan !== 'pro';
    const showTooltip = proTooltip === skill.id;

    return (
      <div className="relative h-full">
        <button
          type="button"
          onClick={() => toggleSkill(skill.id)}
          className={`relative w-full h-full p-4 rounded-xl border-2 text-left transition-all ${
            isLocked
              ? 'border-slate-700/50 bg-slate-900/30 opacity-60 cursor-pointer hover:opacity-75'
              : isSelected
                ? 'border-violet-600 bg-slate-900 shadow-lg shadow-violet-600/10'
                : 'border-slate-800 bg-slate-900 hover:border-slate-700 cursor-pointer'
          }`}
        >
          {/* Pro badge */}
          {skill.pro && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" />
              PRO
            </div>
          )}
          {/* Selected checkmark */}
          {isSelected && !isLocked && (
            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isLocked ? 'bg-slate-800 text-slate-500' : 'bg-violet-600/20 text-violet-400'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className={`min-w-0 ${skill.pro ? 'pr-12' : ''}`}>
              <div className="font-medium text-sm leading-tight">{skill.label}</div>
              <div className={`text-xs mt-0.5 leading-snug ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                {skill.description}
              </div>
              <div className={`text-[10px] mt-1.5 font-medium uppercase tracking-wider ${isLocked ? 'text-slate-600' : 'text-slate-500'}`}>
                {skill.category}
              </div>
            </div>
          </div>
        </button>
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
            Upgrade to Pro to unlock
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
          </div>
        )}
      </div>
    );
  };

  // Messenger setup card for Step 6
  const MessengerSetupCard = ({ messengerId }: { messengerId: string }) => {
    const info = MESSENGER_SETUP_INFO[messengerId];
    if (!info) return null;
    const Icon = info.icon;
    const status: MessengerSetupStatus = serverActive ? 'ready' : 'pending';

    return (
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-violet-400" />
            <span className="font-medium text-sm">{info.title}</span>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            status === 'pending'
              ? 'bg-slate-800 text-slate-400'
              : status === 'ready'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-violet-500/20 text-violet-400'
          }`}>
            {status === 'pending' ? 'Waiting…' : status === 'ready' ? 'Ready' : 'Connected'}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {status === 'pending' ? info.pendingMsg : info.readyMsg}
        </p>
        {status === 'ready' && messengerId === 'telegram' && (
          <input
            type="text"
            placeholder="Paste your bot token here..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        )}
        {status === 'ready' && messengerId === 'whatsapp' && (
          <div className="w-full h-32 bg-slate-800 rounded-lg flex items-center justify-center">
            <QrCode className="w-12 h-12 text-slate-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => {
          // Hide Server Size dot when Oracle is selected
          if (i === 2 && hosting === 'oracle') return null;
          return (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-violet-600' : i < step ? 'bg-violet-600/50' : 'bg-slate-700'
              }`}
            />
          );
        })}
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
              <Card selected={hosting === 'oracle'} onClick={() => { setHosting('oracle'); setVmSize(''); }}>
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-red-400" />
                  <div>
                    <div className="font-semibold">Oracle Cloud <span className="text-xs text-green-400 ml-2">Free</span></div>
                    <div className="text-sm text-slate-400">Always Free ARM server — no credit card, no hosting cost</div>
                  </div>
                </div>
              </Card>
              <Card selected={hosting === 'azure'} onClick={() => { setHosting('azure'); setVmSize(getDefaultSize('azure')); }}>
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="font-semibold">Microsoft Azure</div>
                    <div className="text-sm text-slate-400">Choose your VM size — starts at ~$4/mo</div>
                  </div>
                </div>
              </Card>
              <Card selected={hosting === 'digitalocean'} onClick={() => { setHosting('digitalocean'); setVmSize(getDefaultSize('digitalocean')); }}>
                <div className="flex items-center gap-3">
                  <Cloud className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="font-semibold">DigitalOcean</div>
                    <div className="text-sm text-slate-400">Reliable cloud hosting — starts at ~$4/mo</div>
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
                if (hosting === 'azure') {
                  window.location.href = '/api/auth/azure';
                } else if (hosting === 'digitalocean') {
                  window.location.href = '/api/auth/digitalocean';
                } else {
                  next();
                }
              }}>
                {hosting === 'oracle' ? 'Next' : hosting === 'azure' ? 'Connect Azure' : 'Connect DigitalOcean'} <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
            {hosting === 'azure' && (
              <p className="text-xs text-slate-500 text-center">
                You&apos;ll sign in with your Microsoft account to connect Azure.
              </p>
            )}
            {hosting === 'digitalocean' && (
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
            )}
          </div>
        )}

        {/* Step 2: Server Size (only for Azure / DigitalOcean) */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your Server Size</h2>
            <p className="text-slate-400 text-center">
              Pick a server for your {hosting === 'azure' ? 'Azure' : 'DigitalOcean'} deployment.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {getSizesForHosting(hosting).map((size) => (
                <Card key={size.id} selected={vmSize === size.id} onClick={() => setVmSize(size.id)}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{size.label}</span>
                      {size.recommended && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">{size.cpu} · {size.ram}</div>
                    <div className="text-lg font-bold text-violet-400">{size.price}</div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={next} disabled={!vmSize}>
                Next <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 3: Plan */}
        {step === 3 && (
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
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm appearance-auto"
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
              <PrimaryBtn onClick={async () => {
                if (plan === 'pro') {
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: 'pro' }),
                  });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  }
                } else {
                  next();
                }
              }}>
                {plan === 'pro' ? 'Subscribe' : 'Next'} <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 4: Messengers */}
        {step === 4 && (
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

        {/* Step 5: Skills */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your Skills</h2>
            <p className="text-slate-400 text-center">
              {plan === 'free'
                ? 'Pick up to 2 skills. Pro skills require an upgrade.'
                : 'All skills are included with Pro.'}
            </p>

            {/* Free skills */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Included</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {FREE_SKILLS.map((s) => (
                  <SkillCard key={s.id} skill={s} />
                ))}
              </div>
            </div>

            {/* Pro skills */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Pro Skills
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {PRO_SKILLS.map((s) => (
                  <SkillCard key={s.id} skill={s} />
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={saveAndLaunch} disabled={skills.length === 0}>
                Launch <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 6: Setup & Connect (provisioning + messenger setup) */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Setting Up Your Assistant</h2>
            {!setupDone && (
              <p className="text-sm text-slate-400 text-center">
                {Math.floor(elapsedSecs / 60)}:{String(elapsedSecs % 60).padStart(2, '0')} elapsed · typically takes 2–4 minutes
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: provisioning progress */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  {!setupDone && <Loader2 className="w-3 h-3 animate-spin" />}
                  {setupDone && <Check className="w-3 h-3 text-green-400" />}
                  Server Progress
                </h3>
                <div className="space-y-2">
                  {setupStatus.map((s, i) => {
                    const isLast = i === setupStatus.length - 1;
                    const isActive = isLast && !setupDone;
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {isActive ? (
                          <Loader2 className="w-4 h-4 text-violet-400 flex-shrink-0 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                        <span className={isActive ? 'text-white font-medium' : 'text-slate-400'}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: messenger setup cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  Connect Messengers
                </h3>
                <div className="space-y-3">
                  {messengers.map((id) => (
                    <MessengerSetupCard key={id} messengerId={id} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Ready */}
        {step === 7 && (
          <div className="text-center space-y-6">
            <Sparkles className="w-16 h-16 text-violet-500 mx-auto" />
            <h1 className="text-3xl font-bold">You&apos;re All Set!</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left space-y-3 max-w-md mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Hosting</span>
                <span>{hosting === 'oracle' ? 'Oracle Cloud (Free)' : hosting === 'azure' ? 'Microsoft Azure' : 'DigitalOcean'}</span>
              </div>
              {hosting !== 'oracle' && vmSize && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Server</span>
                  <span>{getSizeLabel(hosting, vmSize)}</span>
                </div>
              )}
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
                <span>{skills.map((s) => SKILLS.find((x) => x.id === s)?.label).join(', ') || 'None'}</span>
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
