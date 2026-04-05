'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles, Cloud, Server, CreditCard, MessageSquare,
  Zap, ArrowRight, ArrowLeft, Check, Loader2, Key,
  Home, Share2, Briefcase, Code, Gamepad2,
  MessageCircle, Send, Hash, Slack, Shield,
  Mail, Globe, Bell, FileText, Sun, Lock,
  ShoppingCart, Plane, DollarSign, CalendarDays,
  QrCode, Bot, Smartphone, AlertCircle, ExternalLink, Phone,
} from 'lucide-react';
import ProgressIndicator from './progress-indicator';
import { MessengerSetupCard } from './messenger-setup-card';

const STEPS = ['Welcome', 'Hosting', 'Subscription', 'VM Size', 'AI Provider', 'Plan', 'Messengers', 'Skills', 'Setup & Connect', 'Ready'];

type VmSizeInfo = {
  name: string;
  vCPUs: number;
  memoryGB: number;
  pricePerHour: number | null;
  pricePerMonth: number | null;
  available: boolean;
  family: string;
};

const TIER_DEFS = [
  { id: 'starter', label: 'Starter', tagline: 'Perfect for getting started', features: ['Calendar management', 'Email', 'Basic automation'], vCPUs: 2, memoryGB: 4 },
  { id: 'standard', label: 'Standard', tagline: 'Great for everyday use', features: ['Everything in Starter', 'Web browsing', 'Code execution', 'File management'], vCPUs: 2, memoryGB: 8, recommended: true },
  { id: 'power', label: 'Power', tagline: 'For heavy workloads', features: ['Everything in Standard', 'Local image generation', 'Large file processing', 'Multiple concurrent tasks'], vCPUs: 4, memoryGB: 16 },
];

const MESSENGERS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'telegram', label: 'Telegram', icon: Send },
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



/** Device flow polling component */
function DeviceFlowPoll({ userCode, verificationUri, onAuthorized, onExpired, onError }: {
  userCode: string;
  verificationUri: string;
  onAuthorized: () => void;
  onExpired: () => void;
  onError: (msg: string) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await new Promise(r => setTimeout(r, 4000));
        if (cancelled) return;
        try {
          const res = await fetch('/api/assistant/copilot-device-status');
          const data = await res.json();
          if (cancelled) return;
          if (data.status === 'authorized') { onAuthorized(); return; }
          if (data.status === 'expired') { onExpired(); return; }
          if (data.status === 'error') { onError(data.error || 'Unknown error'); return; }
          // pending — continue polling
        } catch {
          // network error, keep polling
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Go to <span className="font-mono text-violet-400">{verificationUri}</span> and enter this code:
      </p>
      <div className="text-center">
        <span className="text-2xl font-mono font-bold tracking-widest text-white bg-slate-800 px-4 py-2 rounded-lg">
          {userCode}
        </span>
      </div>
      <a
        href={verificationUri}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-colors"
      >
        Open GitHub <ExternalLink className="w-3 h-3" />
      </a>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Waiting for authorization...
      </div>
    </div>
  );
}


export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [hosting, setHosting] = useState('azure');
  const [vmSize, setVmSize] = useState('');
  const [vmSizes, setVmSizes] = useState<VmSizeInfo[]>([]);
  const [vmSizesLoading, setVmSizesLoading] = useState(false);
  const [vmSizeAdvanced, setVmSizeAdvanced] = useState(false);

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
  const [windowStart, setWindowStart] = useState(() => {
    const now = new Date();
    return (now.getHours() - 1 + 24) % 24;
  });
  const [messengers, setMessengers] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [setupStatus, setSetupStatus] = useState<string[]>([]);
  const [setupDone, setSetupDone] = useState(false);
  const [serverActive, setServerActive] = useState(false);
  const [proTooltip, setProTooltip] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [botLinks, setBotLinks] = useState<Record<string, string>>({});

  // AI Model state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'github-copilot' | ''>('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiKeyVerified, setAiKeyVerified] = useState(false);
  const [aiKeyVerifying, setAiKeyVerifying] = useState(false);
  const [aiKeyError, setAiKeyError] = useState<string | null>(null);

  // Device flow state
  const [deviceFlowCode, setDeviceFlowCode] = useState<string | null>(null);
  const [deviceFlowUri, setDeviceFlowUri] = useState<string | null>(null);
  const [deviceFlowLoading, setDeviceFlowLoading] = useState(false);
  const [deviceFlowError, setDeviceFlowError] = useState<string | null>(null);
  const [deviceFlowPolling, setDeviceFlowPolling] = useState(false);

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
        access_denied: 'Access was denied. Please try again.',
        github_error: 'GitHub sign-in failed. Please try again.',
        oauth_not_configured: 'GitHub OAuth is not configured.',
        save_failed: 'Failed to save your credentials. Please try again.',
      };
      setOnboardingError(errorMessages[errorParam] ?? 'Something went wrong. Please try again.');

      // Route back to the correct step based on where the error came from
      const githubErrors = ['token_exchange', 'missing_code', 'invalid_state', 'access_denied', 'github_error', 'oauth_not_configured', 'save_failed'];
      if (githubErrors.includes(errorParam) && stepParam) {
        // If we have a step param from returnTo, use it
        const s = parseInt(stepParam, 10);
        if (s >= 0 && s < STEPS.length) { setStep(s); return; }
      }
      if (githubErrors.includes(errorParam)) {
        setStep(4); // AI Provider step
      } else {
        setStep(1); // Hosting step for Azure errors
      }
      return;
    }

    // Handle GitHub Copilot OAuth success: mark as connected and advance


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
        setStep(5);
      }
    }
    if (upgraded === 'true' && !stepParam) {
      setPlan('pro');
      setStep(6);
      setMessengers(MESSENGERS.map((m) => m.id));
      setSkills(SKILLS.filter((s) => !s.pro).map((s) => s.id));
    }
  }, [searchParams]);

  // Resume provisioning state on page load/return
  useEffect(() => {
    async function checkExistingAssistant() {
      try {
        const res = await fetch('/api/assistant/status');
        if (!res.ok) return;
        const data = await res.json();
        const assistant = data.assistant;

        if (!assistant) return; // No assistant yet, normal flow

        if (assistant.status === 'active') {
          // VM is already active - jump to Setup & Connect step
          setServerActive(true);
          setSetupDone(true);
          setSetupStatus((prev) => [...prev, 'Server is online']);
          // Restore AI provider from user profile
          if (data.aiProvider) {
            setAiProvider(data.aiProvider as typeof aiProvider);
          }
          setStep((currentStep) => {
            if (currentStep < 7) return 7;
            return currentStep; // Don't jump backward
          });
        } else if (assistant.status === 'provisioning') {
          // VM is provisioning - jump to Setup & Connect and start polling
          if (data.aiProvider) {
            setAiProvider(data.aiProvider as typeof aiProvider);
          }
          setStep((currentStep) => {
            if (currentStep < 7) {
              setServerActive(false);
              setSetupDone(false);
              setSetupStatus((prev) => [...prev, 'Resuming provisioning...']);
              return 7;
            }
            return currentStep;
          });
        } else if (assistant.status === 'suspended') {
          // VM exists but is suspended - send to dashboard where they can resume
          window.location.href = '/dashboard';
          return;
        }
      } catch {
        // Ignore errors - user might not have started yet
      }
    }

    // Only check after a small delay to let searchParams effect run first
    const timer = setTimeout(checkExistingAssistant, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Fetch VM sizes when entering VM Size step
  useEffect(() => {
    if (step !== 3 || hosting !== 'azure' || !selectedSubId) return;
    let cancelled = false;
    setVmSizesLoading(true);
    fetch(`/api/azure/vm-sizes?subscriptionId=${encodeURIComponent(selectedSubId)}&region=southcentralus`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setVmSizes(data.sizes ?? []);
        setVmSizesLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setVmSizes([]);
        setVmSizesLoading(false);
      });
    return () => { cancelled = true; };
  }, [step, hosting, selectedSubId]);

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
    if (step !== 7 || setupDone) return;
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
    goTo(8);
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
          timezone, plan, windowStart, messengers, skills, aiProvider, vmSize,
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
      setTimeout(() => goTo(9), 2000);
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
          setTimeout(() => goTo(9), 2000);
          return;
        }
        // No assistant found at all after many attempts = likely failed
        if (!data.assistant && attempts > 30) {
          addStatus('Something went wrong - please try launching from your dashboard');
          setSetupDone(true);
          setTimeout(() => goTo(9), 2000);
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


  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      {/* Progress indicator */}
      <ProgressIndicator currentStep={step} />

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

        {/* Step 3: VM Size */}
        {step === 3 && hosting === 'azure' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Choose Your VM Size</h2>
            <p className="text-sm text-slate-400 text-center">You&apos;re only charged for actual usage. Costs are estimated based on Azure pay-as-you-go pricing.</p>

            {vmSizesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
            ) : !vmSizeAdvanced ? (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {TIER_DEFS.map((tier) => {
                    const match = vmSizes.find((s) => s.available && s.vCPUs === tier.vCPUs && s.memoryGB === tier.memoryGB && s.family.toLowerCase().includes('bs'));
                    const fallback = vmSizes.find((s) => s.available && s.vCPUs === tier.vCPUs && s.memoryGB === tier.memoryGB);
                    const vm = match || fallback;
                    const unavailable = !vm;
                    const selected = vm && vmSize === vm.name;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => vm && setVmSize(vm.name)}
                        className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                          unavailable ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/50' :
                          selected ? 'border-violet-500 bg-violet-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                        }`}
                      >
                        {'recommended' in tier && tier.recommended && (
                          <span className="absolute -top-2 right-3 bg-violet-600 text-xs px-2 py-0.5 rounded-full font-medium">RECOMMENDED</span>
                        )}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-lg">{tier.label}</div>
                            <div className="text-sm text-slate-400">{tier.tagline}</div>
                            <div className="text-xs text-slate-500 mt-1">{tier.vCPUs} vCPU · {tier.memoryGB} GB RAM</div>
                            <ul className="text-xs text-slate-400 mt-2 space-y-0.5">
                              {tier.features.map((f) => <li key={f} className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" />{f}</li>)}
                            </ul>
                          </div>
                          {vm && vm.pricePerMonth !== null && (
                            <div className="text-right text-sm">
                              <div className="font-semibold">${vm.pricePerMonth.toFixed(0)}<span className="text-xs text-slate-400">/mo 24/7</span></div>
                              <div className="text-slate-400">${(vm.pricePerMonth / 3).toFixed(0)}<span className="text-xs">/mo 8hrs/day</span></div>
                            </div>
                          )}
                        </div>
                        {unavailable && <div className="text-xs text-amber-400 mt-2">Not available on your subscription</div>}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setVmSizeAdvanced(true)}
                  className="text-sm text-violet-400 hover:text-violet-300 underline"
                >Show all available sizes</button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setVmSizeAdvanced(false)}
                  className="text-sm text-violet-400 hover:text-violet-300 underline"
                >← Back to simple view</button>
                <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr><th className="px-3 py-2 text-left">VM Size</th><th className="px-3 py-2">vCPUs</th><th className="px-3 py-2">RAM</th><th className="px-3 py-2">$/hr</th><th className="px-3 py-2">$/mo</th></tr>
                    </thead>
                    <tbody>
                      {vmSizes.filter((s) => s.available).map((s) => (
                        <tr
                          key={s.name}
                          onClick={() => setVmSize(s.name)}
                          className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/50 ${vmSize === s.name ? 'bg-violet-500/10' : ''}`}
                        >
                          <td className="px-3 py-2 font-mono text-xs">{s.name}</td>
                          <td className="px-3 py-2 text-center">{s.vCPUs}</td>
                          <td className="px-3 py-2 text-center">{s.memoryGB} GB</td>
                          <td className="px-3 py-2 text-center">{s.pricePerHour !== null ? `$${s.pricePerHour.toFixed(4)}` : '—'}</td>
                          <td className="px-3 py-2 text-center">{s.pricePerMonth !== null ? `$${s.pricePerMonth.toFixed(0)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={next} disabled={!vmSize || vmSizesLoading}>
                Next <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 4: AI Provider */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <Key className="w-12 h-12 text-violet-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Choose Your AI Provider</h2>
              <p className="text-slate-400 mt-2">Pick which AI provider you want to use. You&apos;ll connect your API key after setup.</p>
            </div>

            <div className="grid gap-4">
              <Card selected={aiProvider === 'gemini'} onClick={() => setAiProvider('gemini')}>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Google Gemini</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40">Recommended</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">Fast, affordable, great for everyday tasks</p>
                    <p className="text-xs text-slate-500 mt-1">Models: Gemini 2.5 Flash, Gemini 2.5 Pro</p>
                  </div>
                </div>
              </Card>

              <Card selected={aiProvider === 'github-copilot'} onClick={() => setAiProvider('github-copilot')}>
                <div className="flex items-start gap-3">
                  <Code className="w-8 h-8 text-violet-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold">GitHub Copilot</div>
                    <p className="text-sm text-slate-400 mt-1">Use your GitHub Copilot subscription for AI models</p>
                    <p className="text-xs text-slate-500 mt-1">Models: GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro</p>
                  </div>
                </div>
              </Card>

              <div className="opacity-50 cursor-not-allowed">
                <Card selected={false} disabled>
                  <div className="flex items-start gap-3">
                    <Zap className="w-8 h-8 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">OpenAI</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Coming Soon</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">GPT-4o and the latest reasoning models</p>
                      <p className="text-xs text-slate-500 mt-1">Models: GPT-4o, GPT-4o mini, o3-mini</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="opacity-50 cursor-not-allowed">
                <Card selected={false} disabled>
                  <div className="flex items-start gap-3">
                    <Bot className="w-8 h-8 text-orange-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Anthropic</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Coming Soon</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">Claude — excellent at writing and analysis</p>
                      <p className="text-xs text-slate-500 mt-1">Models: Claude Sonnet 4, Claude Haiku</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <BackBtn />
              <PrimaryBtn onClick={next} disabled={!aiProvider}>
                Next <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* Step 4: Plan */}
        {step === 5 && (
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
                    body: JSON.stringify({ plan: 'pro', returnUrl: '/onboarding?step=6&upgraded=true' }),
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

        {/* Step 5: Messengers */}
        {step === 6 && (
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

        {/* Step 6: Skills */}
        {step === 7 && (
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

        {/* Step 7: Setup & Connect (provisioning + messenger setup) */}
        {step === 8 && (
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
              {/* AI Provider setup */}
              <div className="space-y-3 mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Key className="w-3 h-3" />
                  AI Provider
                </h3>
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                      <span className="font-medium text-sm">
                        {aiProvider === 'gemini' ? 'Google Gemini' : aiProvider === 'openai' ? 'OpenAI' : aiProvider === 'anthropic' ? 'Anthropic' : aiProvider === 'github-copilot' ? 'GitHub Copilot' : 'AI Provider'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${aiKeyVerified ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                      {aiKeyVerified ? 'Connected' : 'Waiting…'}
                    </span>
                  </div>
                  {serverActive && !aiKeyVerified && (
                    <div className="space-y-3">
                      {aiProvider === 'github-copilot' ? (
                        <>
                          {!deviceFlowCode && !deviceFlowPolling && (
                            <>
                              <p className="text-xs text-slate-400">Sign in with GitHub to connect your Copilot subscription.</p>
                              <button
                                type="button"
                                disabled={deviceFlowLoading}
                                onClick={async () => {
                                  setDeviceFlowLoading(true);
                                  setDeviceFlowError(null);
                                  try {
                                    const res = await fetch('/api/assistant/copilot-device-start', { method: 'POST' });
                                    const data = await res.json();
                                    if (data.userCode && data.verificationUri) {
                                      setDeviceFlowCode(data.userCode);
                                      setDeviceFlowUri(data.verificationUri);
                                      setDeviceFlowPolling(true);
                                    } else {
                                      setDeviceFlowError(data.error || 'Failed to start device flow');
                                    }
                                  } catch {
                                    setDeviceFlowError('Failed to start device flow');
                                  }
                                  setDeviceFlowLoading(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-medium text-white transition-colors"
                              >
                                {deviceFlowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
                                Connect GitHub Copilot
                              </button>
                              {deviceFlowError && <p className="text-xs text-red-400">{deviceFlowError}</p>}
                            </>
                          )}
                          {deviceFlowCode && deviceFlowPolling && (
                            <DeviceFlowPoll
                              userCode={deviceFlowCode}
                              verificationUri={deviceFlowUri!}
                              onAuthorized={async () => {
                                setAiKeyVerified(true);
                                setDeviceFlowPolling(false);
                                // Persist AI provider choice to the DB
                                try {
                                  await fetch('/api/onboarding', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ aiProvider: 'github-copilot' }),
                                  });
                                } catch { /* ignore */ }
                              }}
                              onExpired={() => {
                                setDeviceFlowCode(null);
                                setDeviceFlowUri(null);
                                setDeviceFlowPolling(false);
                                setDeviceFlowError('Code expired. Try again.');
                              }}
                              onError={(msg) => {
                                setDeviceFlowCode(null);
                                setDeviceFlowUri(null);
                                setDeviceFlowPolling(false);
                                setDeviceFlowError(msg);
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400">Enter your API key to connect your AI provider.</p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={aiApiKey}
                          onChange={(e) => { setAiApiKey(e.target.value); setAiKeyVerified(false); setAiKeyError(null); }}
                          placeholder={aiProvider === 'gemini' ? 'AIza...' : aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={!aiApiKey || aiKeyVerifying}
                          onClick={async () => {
                            setAiKeyVerifying(true);
                            setAiKeyError(null);
                            try {
                              const res = await fetch('/api/ai/verify-key', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ provider: aiProvider, apiKey: aiApiKey }),
                              });
                              const data = await res.json();
                              if (data.valid) {
                                setAiKeyVerified(true);
                                // Save to DB and configure on VM
                                try {
                                  await fetch('/api/onboarding', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ aiProvider, aiApiKey }),
                                  });
                                } catch { /* ignore */ }
                                try {
                                  await fetch('/api/assistant/configure-ai', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ provider: aiProvider, apiKey: aiApiKey }),
                                  });
                                } catch { /* ignore */ }
                              } else {
                                setAiKeyError(data.error || 'Invalid API key');
                              }
                            } catch {
                              setAiKeyError('Verification failed');
                            }
                            setAiKeyVerifying(false);
                          }}
                          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center gap-1.5"
                        >
                          {aiKeyVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                          {aiKeyVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                      {aiKeyError && <p className="text-xs text-red-400">{aiKeyError}</p>}
                      <a
                        href={aiProvider === 'gemini' ? 'https://aistudio.google.com/apikey' : aiProvider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com/settings/keys'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                      >
                        Get a key <ExternalLink className="w-3 h-3" />
                      </a>
                        </>
                      )}
                    </div>
                  )}
                  {serverActive && aiKeyVerified && (
                    <p className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> API key verified and configured</p>
                  )}
                  {!serverActive && (
                    <p className="text-xs text-slate-400">Waiting for server to start...</p>
                  )}
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
                    // Persist all onboarding state and mark complete
                    try {
                      await fetch('/api/onboarding', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          onboardingComplete: true,
                          timezone,
                          plan,
                          windowStart,
                          messengers,
                          skills,
                          aiProvider,
                          vmSize,
                          ...(selectedSubId ? { azureSubscriptionId: selectedSubId } : {}),
                        }),
                      });
                    } catch { /* ignore */ }
                    goTo(9);
                  }}
                >
                  Continue to Dashboard <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </div>
            )}

            {/* Error state: show go to dashboard */}
            {setupDone && !serverActive && (
              <div className="flex justify-center pt-2">
                <PrimaryBtn onClick={() => goTo(9)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </PrimaryBtn>
              </div>
            )}
          </div>
        )}



                {/* Step 9: Ready */}
        {step === 9 && (
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
