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
  QrCode, Bot, Smartphone, AlertCircle, ExternalLink,
} from 'lucide-react';

const STEPS = ['Welcome', 'Hosting', 'Subscription', 'Plan', 'Messengers', 'Skills', 'Setup & Connect', 'Ready'];

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

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [hosting, setHosting] = useState('azure');
  const [vmSize, setVmSize] = useState('');

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

  const getDefaultSize = (provider: string) => {
    if (provider === 'azure') return AZURE_SIZES[0].id;
    if (provider === 'digitalocean') return DO_SIZES[0].id;
    return '';
  };
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [windowStart, setWindowStart] = useState(9);
  const [messengers, setMessengers] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [setupStatus, setSetupStatus] = useState<string[]>([]);
  const [setupDone, setSetupDone] = useState(false);
  const [serverActive, setServerActive] = useState(false);
  const [proTooltip, setProTooltip] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [botLinks, setBotLinks] = useState<Record<string, string>>({});

  // Azure subscription picker state
  type AzureSub = { id: string; displayName: string; state: string };
  const [azureSubs, setAzureSubs] = useState<AzureSub[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

  // Init from URL params and timezone
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

    const stepParam = searchParams.get('step');
    const connected = searchParams.get('connected');
    const upgraded = searchParams.get('upgraded');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        azure_no_subscription: 'Could not connect to Azure. Make sure you have an active Azure subscription with your Microsoft account.',
        token_exchange: 'Sign-in failed. Please try again.',
        missing_code: 'Sign-in was incomplete. Please try again.',
        invalid_state: 'Sign-in verification failed. Please try again.',
        no_tenant: 'Could not determine your Azure tenant. Please try again.',
      };
      setOnboardingError(errorMessages[errorParam] ?? 'Something went wrong. Please try again.');
      setStep(1); // Go back to hosting step
      return;
    }

    if (stepParam) {
      const s = parseInt(stepParam, 10);
      if (s >= 0 && s < STEPS.length) setStep(s);
    }
    if ((connected === 'digitalocean' || connected === 'azure') && !stepParam) {
      setHosting(connected);
      setVmSize(getDefaultSize(connected));
      if (connected === 'azure') {
        // Go to subscription picker
        setStep(2);
      } else {
        // Skip subscription step for non-Azure providers
        setStep(3);
      }
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

  // Fetch Azure subscriptions when entering the subscription picker step
  useEffect(() => {
    if (step !== 2 || hosting !== 'azure') return;
    if (azureSubs.length > 0) return; // Already fetched

    let cancelled = false;
    setSubsLoading(true);
    setSubsError(null);

    fetch('/api/azure/subscriptions')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch subscriptions');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const subs: AzureSub[] = data.subscriptions ?? [];
        setAzureSubs(subs);
        // Auto-select the first enabled sub
        const enabled = subs.filter((s) => s.state === 'Enabled');
        if (enabled.length > 0 && !selectedSubId) {
          setSelectedSubId(enabled[0].id);
        }
        setSubsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setSubsError(err.message ?? 'Failed to load subscriptions');
        setSubsLoading(false);
      });

    return () => { cancelled = true; };
  }, [step, hosting, azureSubs.length, selectedSubId]);

  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);

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

  // Timer for setup step - persists launch time in sessionStorage
  useEffect(() => {
    if (step !== 6 || setupDone) return;
    // Recover or set launch timestamp
    let launchTime = Number(sessionStorage.getItem('sw_launch_ts') || '0');
    if (!launchTime) {
      launchTime = Date.now();
      sessionStorage.setItem('sw_launch_ts', String(launchTime));
    }
    const tick = () => setElapsedSecs(Math.floor((Date.now() - launchTime) / 1000));
    tick(); // set immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, setupDone]);

  const saveAndLaunch = async () => {
    goTo(6);
    setServerActive(false);
    // Reset launch timer
    sessionStorage.setItem('sw_launch_ts', String(Date.now()));
    const statuses: string[] = [];
    const addStatus = (s: string) => {
      statuses.push(s);
      setSetupStatus([...statuses]);
    };

    addStatus('Saving preferences...');
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone, plan, windowStart, messengers, skills,
          onboardingComplete: false,
          ...(selectedSubId ? { azureSubscriptionId: selectedSubId } : {}),
        }),
      });
    } catch {
      addStatus('Warning: Could not save preferences');
    }

    addStatus('Starting server provisioning...');
    let launchFailed = false;
    try {
      const launchRes = await fetch('/api/launch', { method: 'POST' });
      if (!launchRes.ok) {
        const errData = await launchRes.json().catch(() => ({}));
        addStatus(`${errData.error ?? 'Launch failed - please try again'}`);
        launchFailed = true;
      }
    } catch {
      addStatus('Launch request failed - check your connection');
      launchFailed = true;
    }

    if (launchFailed) {
      setSetupDone(true);
      setTimeout(() => goTo(7), 2000);
      return;
    }
    let attempts = 0;
    const milestones = [
      { at: 15, msg: `Creating your server on ${hosting === 'azure' ? 'Azure' : hosting === 'oracle' ? 'Oracle Cloud' : 'DigitalOcean'}...` },
      { at: 30, msg: 'Installing OpenClaw and dependencies...' },
      { at: 60, msg: 'Configuring your assistant...' },
      { at: 90, msg: 'Almost there - starting services...' },
      { at: 180, msg: 'Still working - this is taking longer than usual...' },
      { at: 300, msg: 'Hang tight - large installs can take up to 10 minutes.' },
    ];
    let nextMilestone = 0;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch('/api/assistant/status');
        const data = await res.json();
        if (data.assistant?.status === 'active') {
          // Server is active in Azure but sidecar may still be starting.
          // Poll the messaging status endpoint to confirm sidecar is reachable.
          addStatus('Server is running - waiting for services to start...');
          let sidecarReady = false;
          for (let check = 0; check < 30; check++) {
            try {
              const statusRes = await fetch('/api/messaging/status');
              if (statusRes.ok) {
                sidecarReady = true;
                break;
              }
            } catch { /* sidecar not up yet */ }
            await new Promise((r) => setTimeout(r, 5000));
          }
          if (!sidecarReady) {
            addStatus('Server is online but services are still starting. You can set up messengers from the dashboard.');
          } else {
            addStatus('Server is online');
          }
          setServerActive(true);
          setSetupDone(true);
          // Don't auto-advance — let user set up messengers first
          return;
        }
        if (data.assistant?.status === 'destroyed' || data.assistant?.status === 'destroying') {
          addStatus('Server provisioning failed - please try again from your dashboard');
          setSetupDone(true);
          setTimeout(() => goTo(7), 2000);
          return;
        }
        // No assistant found at all after many attempts = likely failed
        if (!data.assistant && attempts > 30) {
          addStatus('Something went wrong - please try launching from your dashboard');
          setSetupDone(true);
          setTimeout(() => goTo(7), 2000);
          return;
        }
      } catch { /* ignore */ }
      attempts++;
      const elapsed = attempts * 5;
      while (nextMilestone < milestones.length && elapsed >= milestones[nextMilestone].at) {
        addStatus(milestones[nextMilestone].msg);
        nextMilestone++;
      }
      // Keep polling every 5 seconds - never give up while provisioning
      await new Promise((r) => setTimeout(r, 5000));
      return poll();
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
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
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
              <div className={`text-sm sm:text-xs mt-0.5 leading-snug ${isLocked ? 'text-slate-600' : 'text-slate-400'}`}>
                {skill.description}
              </div>
              <div className={`text-xs sm:text-[10px] mt-1.5 font-medium uppercase tracking-wider ${isLocked ? 'text-slate-600' : 'text-slate-500'}`}>
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

  // Messenger setup card for Step 5
  const MessengerSetupCard = ({ messengerId, isServerActive, onReady }: {
    messengerId: string;
    isServerActive: boolean;
    onReady?: (platform: string, link: string) => void;
  }) => {
    const info = MESSENGER_SETUP_INFO[messengerId];
    const [status, setStatus] = useState<'waiting' | 'setting-up' | 'ready' | 'connected' | 'failed' | 'manual-token'>('waiting');
    const [botLink, setBotLink] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [controlUiUrl, setControlUiUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [qrExpired, setQrExpired] = useState(false);
    const [manualToken, setManualToken] = useState('');

    const triggerSetup = useCallback(async () => {
      setStatus('setting-up');
      setError(null);
      setQrExpired(false);
      try {
        const res = await fetch('/api/messaging/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: messengerId }),
        });
        if (!res.ok) {
          setError(`Setup failed (HTTP ${res.status})`);
          setStatus('failed');
          return;
        }
        const data = await res.json();

        if (data.error) {
          if (data.error === 'manual_setup_required') {
            setStatus('manual-token');
          } else {
            setError(data.error);
            setStatus('failed');
          }
        } else if (data.botLink) {
          setBotLink(data.botLink);
          setStatus('ready');
          onReady?.(messengerId, data.botLink);
        } else if (data.controlUiUrl) {
          setControlUiUrl(data.controlUiUrl);
          setStatus('ready');
        } else if (data.qr) {
          setQrCode(data.qr);
          setStatus('ready');
        } else if (data.status === 'configured' || data.status === 'connected') {
          setStatus('connected');
          if (data.botLink) onReady?.(messengerId, data.botLink);
        } else {
          // Generic success — mark as ready
          setStatus('ready');
        }
      } catch {
        setError('Failed to set up — please try again');
        setStatus('failed');
      }
    }, [messengerId, onReady]);

    // Auto-trigger setup when server comes online
    useEffect(() => {
      if (!isServerActive || status !== 'waiting') return;
      triggerSetup();
    }, [isServerActive, status, triggerSetup]);

    // Poll for connection status when QR is shown (WhatsApp/Signal)
    useEffect(() => {
      if (status !== 'ready' || !qrCode) return;
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 40; // ~2 min at 3s intervals

      const poll = async () => {
        while (!cancelled && attempts < maxAttempts) {
          attempts++;
          await new Promise((r) => setTimeout(r, 3000));
          if (cancelled) return;
          try {
            const res = await fetch('/api/messaging/status');
            if (!res.ok) continue;
            const data = await res.json();
            const plat = data.platforms?.[messengerId];
            if (plat?.connected) {
              setStatus('connected');
              if (plat.botLink) onReady?.(messengerId, plat.botLink);
              return;
            }
          } catch { /* ignore */ }
        }
        if (!cancelled && attempts >= maxAttempts) {
          setQrExpired(true);
        }
      };
      poll();
      return () => { cancelled = true; };
    }, [status, qrCode, messengerId, onReady]);

    if (!info) return null;
    const Icon = info.icon;

    const badgeClass =
      status === 'waiting' ? 'bg-slate-800 text-slate-400' :
      status === 'setting-up' ? 'bg-amber-500/20 text-amber-400' :
      status === 'connected' ? 'bg-violet-500/20 text-violet-400' :
      status === 'failed' ? 'bg-red-500/20 text-red-400' :
      status === 'manual-token' ? 'bg-blue-500/20 text-blue-400' :
      'bg-green-500/20 text-green-400';

    const badgeLabel =
      status === 'waiting' ? 'Waiting…' :
      status === 'setting-up' ? 'Setting up…' :
      status === 'connected' ? 'Connected' :
      status === 'failed' ? 'Failed' :
      status === 'manual-token' ? 'Setup' :
      'Ready';

    return (
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-violet-400" />
            <span className="font-medium text-sm">{info.title}</span>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>

        {/* Waiting state */}
        {status === 'waiting' && (
          <p className="text-xs text-slate-400 leading-relaxed">{info.pendingMsg}</p>
        )}

        {/* Setting up state */}
        {status === 'setting-up' && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            {messengerId === 'telegram' ? 'Creating your Telegram bot…' :
             messengerId === 'whatsapp' ? 'Generating QR code…' :
             `Configuring ${info.title}…`}
          </div>
        )}

        {/* Ready state — Telegram: show bot link */}
        {status === 'ready' && messengerId === 'telegram' && botLink && (
          <div className="space-y-2">
            <p className="text-xs text-green-400">Bot created — tap to start chatting</p>
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-lg bg-blue-500 hover:bg-blue-400 py-3 text-sm font-medium transition"
            >
              Open in Telegram →
            </a>
          </div>
        )}

        {/* Ready state — WhatsApp/Signal: show QR code */}
        {status === 'ready' && qrCode && !qrExpired && (messengerId === 'whatsapp' || messengerId === 'signal') && (
          <div className="space-y-3">
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-slate-200">How to connect:</p>
              <ol className="list-decimal ml-4 space-y-0.5 text-xs text-slate-400">
                <li>Open <strong className="text-slate-300">WhatsApp</strong> on your phone</li>
                <li>Go to <strong className="text-slate-300">Settings → Linked Devices</strong></li>
                <li>Tap <strong className="text-slate-300">Link a Device</strong></li>
                <li>Point your camera at the QR below</li>
              </ol>
              <p className="text-xs text-amber-400/80">⚠️ View this QR on a different screen than your phone</p>
            </div>
            <img
              src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
              alt={`Scan QR code with ${info.title}`}
              className="w-48 h-48 mx-auto rounded-lg bg-white p-1"
            />
            <p className="text-xs text-slate-500 text-center">Waiting for scan...</p>
          </div>
        )}

        {/* Ready state — WhatsApp Control UI link */}
        {status === 'ready' && controlUiUrl && !qrCode && (
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              Open your assistant&apos;s control panel to connect WhatsApp. Go to <strong>Channels</strong> and scan the QR code.
            </p>
            <a
              href={controlUiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-lg bg-green-600 hover:bg-green-500 py-3 text-sm font-medium transition"
            >
              Open Control Panel
            </a>
          </div>
        )}

        {/* QR expired */}
        {status === 'ready' && qrExpired && (
          <div className="space-y-2">
            <p className="text-xs text-amber-400">QR code expired</p>
            <button
              type="button"
              onClick={triggerSetup}
              className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-sm font-medium transition border border-slate-700"
            >
              Regenerate QR Code
            </button>
          </div>
        )}

        {/* Ready state — Discord/Slack: show link */}
        {status === 'ready' && botLink && messengerId !== 'telegram' && messengerId !== 'whatsapp' && messengerId !== 'signal' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-300">{info.readyMsg}</p>
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-lg bg-violet-600 hover:bg-violet-500 py-2 text-sm font-medium transition"
            >
              Connect {info.title} →
            </a>
          </div>
        )}

        {/* Ready state — generic (no link, no QR) */}
        {status === 'ready' && !botLink && !qrCode && (
          <p className="text-xs text-slate-300">{info.readyMsg}</p>
        )}

        {/* Manual token entry (Telegram) */}
        {status === 'manual-token' && messengerId === 'telegram' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300 space-y-1">
              <p>Create a Telegram bot in 3 steps:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@BotFather</a> in Telegram</li>
                <li>Send <code className="bg-slate-800 px-1 rounded">/newbot</code> and follow the prompts</li>
                <li>Copy the bot token and paste it below</li>
              </ol>
            </div>
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste bot token (e.g. 123456:ABC-DEF...)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
            <button
              type="button"
              disabled={!manualToken.includes(':')}
              onClick={async () => {
                setStatus('setting-up');
                setError(null);
                try {
                  const res = await fetch('/api/messaging/setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform: 'telegram', botToken: manualToken }),
                  });
                  const data = await res.json();
                  if (data.status === 'configured') {
                    setStatus('connected');
                    if (data.botLink) {
                      setBotLink(data.botLink);
                      onReady?.('telegram', data.botLink);
                    }
                  } else if (data.error) {
                    setError(data.error);
                    setStatus('failed');
                  }
                } catch {
                  setError('Failed to connect bot');
                  setStatus('failed');
                }
              }}
              className="w-full text-center rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 text-sm font-medium transition"
            >
              Connect Bot
            </button>
          </div>
        )}

        {/* Connected state */}
        {status === 'connected' && (
          <p className="text-xs text-green-400">{info.title} is connected!</p>
        )}

        {/* Failed state */}
        {status === 'failed' && (
          <div className="space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={triggerSetup}
              className="w-full text-center rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-sm font-medium transition border border-slate-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  };

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
            {onboardingError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-300 text-center">
                {onboardingError}
              </div>
            )}
            <div className="grid gap-4">
              <Card selected={hosting === 'azure'} onClick={() => { setHosting('azure'); setVmSize(getDefaultSize('azure')); }}>
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="font-semibold">Microsoft Azure</div>
                    <div className="text-sm text-slate-400">Choose your VM size — starts at ~$4/mo</div>
                  </div>
                </div>
              </Card>
              <Card disabled>
                <div className="flex items-center gap-3">
                  <Cloud className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="font-semibold">Oracle Cloud <span className="text-xs text-slate-400 ml-2">Coming soon</span></div>
                    <div className="text-sm text-slate-400">Always Free ARM server</div>
                  </div>
                </div>
              </Card>
              <Card disabled>
                <div className="flex items-center gap-3">
                  <Sun className="w-8 h-8 text-amber-400" />
                  <div>
                    <div className="font-semibold">DigitalOcean <span className="text-xs text-slate-400 ml-2">Coming soon</span></div>
                    <div className="text-sm text-slate-400">Reliable cloud hosting</div>
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
                window.location.href = '/api/auth/azure';
              }}>
                Connect Azure <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
            <p className="text-xs text-slate-500 text-center">
              You&apos;ll sign in with your Microsoft account to connect Azure.
            </p>
          </div>
        )}

        {/* Step 2: Azure Subscription Picker */}
        {step === 2 && hosting === 'azure' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Select Your Azure Subscription</h2>
            <p className="text-slate-400 text-center">
              Your assistant&apos;s server will be created in this subscription. You&apos;ll only pay Azure for the VM resources used.
            </p>

            {subsLoading && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span className="text-slate-300">Loading your subscriptions...</span>
              </div>
            )}

            {subsError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-300 text-center">
                {subsError}
                <button
                  type="button"
                  onClick={() => { setAzureSubs([]); setSubsLoading(true); setSubsError(null); }}
                  className="ml-2 underline hover:text-red-200"
                >
                  Retry
                </button>
              </div>
            )}

            {!subsLoading && !subsError && azureSubs.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <div>
                  <p className="font-medium">No Azure subscriptions found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    You need an Azure subscription to host your assistant. Create a free one with $200 in credits to get started.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="https://azure.microsoft.com/free/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Create Free Subscription <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setAzureSubs([]); setSubsLoading(true); setSubsError(null); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-700"
                  >
                    I created one - check again
                  </button>
                </div>
              </div>
            )}

            {!subsLoading && !subsError && azureSubs.length > 0 && (
              <div className="grid gap-3">
                {azureSubs.map((sub) => {
                  const isEnabled = sub.state === 'Enabled';
                  return (
                    <Card
                      key={sub.id}
                      selected={selectedSubId === sub.id}
                      disabled={!isEnabled}
                      onClick={isEnabled ? () => setSelectedSubId(sub.id) : undefined}
                    >
                      <div className="flex items-start gap-3">
                        <Server className="w-7 h-7 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{sub.displayName}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isEnabled
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                              {sub.state}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono truncate mt-0.5">{sub.id}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn
                onClick={next}
                disabled={!selectedSubId || subsLoading}
              >
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
                    body: JSON.stringify({ plan: 'pro', returnUrl: '/onboarding?step=4&upgraded=true' }),
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <h2 className="text-2xl font-bold text-center">
              {setupDone && serverActive ? 'Connect Your Messengers' : 'Setting Up Your Assistant'}
            </h2>
            {!setupDone && (
              <p className="text-sm text-slate-400 text-center">
                {Math.floor(elapsedSecs / 60)}:{String(elapsedSecs % 60).padStart(2, '0')} elapsed · typically takes 2–4 minutes
              </p>
            )}
            {setupDone && serverActive && (
              <p className="text-sm text-slate-400 text-center">
                Your server is online. Connect at least one messenger so you can talk to your assistant.
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
                    <MessengerSetupCard
                      key={id}
                      messengerId={id}
                      isServerActive={serverActive}
                      onReady={(platform, link) => setBotLinks((prev) => ({ ...prev, [platform]: link }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Continue button appears when server is active */}
            {setupDone && serverActive && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <p className="text-sm text-green-400 font-medium">
                  Your server is ready. Set up your messengers above, or continue to your dashboard.
                </p>
                <PrimaryBtn
                  onClick={async () => {
                    await fetch('/api/onboarding', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ onboardingComplete: true }),
                    });
                    goTo(7);
                  }}
                >
                  Continue to Dashboard <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </div>
            )}

            {/* Error state: show go to dashboard */}
            {setupDone && !serverActive && (
              <div className="flex justify-center pt-2">
                <PrimaryBtn onClick={() => goTo(7)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </div>
            )}
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
                <span>{hosting === 'azure' ? 'Microsoft Azure' : hosting === 'oracle' ? 'Oracle Cloud' : 'DigitalOcean'}</span>
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
                <span>{skills.map((s) => SKILLS.find((x) => x.id === s)?.label).join(', ') || 'None'}</span>
              </div>
            </div>

            {/* Messenger quick links */}
            <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
              {messengers.includes('telegram') && botLinks.telegram && (
                <a
                  href={botLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-full bg-blue-500 hover:bg-blue-400 py-3 font-medium transition"
                >
                  Open in Telegram →
                </a>
              )}
              {messengers.includes('whatsapp') && botLinks.whatsapp && (
                <a
                  href={botLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-full bg-green-600 hover:bg-green-500 py-3 font-medium transition"
                >
                  Open in WhatsApp →
                </a>
              )}
              {messengers.includes('discord') && botLinks.discord && (
                <a
                  href={botLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-full bg-indigo-600 hover:bg-indigo-500 py-3 font-medium transition"
                >
                  Open Discord →
                </a>
              )}
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
