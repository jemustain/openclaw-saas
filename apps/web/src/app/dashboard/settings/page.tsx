'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { TimezonePicker } from '@/components/ui/timezone-picker';
import { Loader2, Monitor, Bot, Database, AlertTriangle } from 'lucide-react';

interface AccountResources {
  vm: { name: string; region: string; ip: string; size: string } | null;
  telegramBot: { username: string } | null;
  database: { tables: string[] };
}

function formatPlan(plan: string): string {
  if (!plan) return 'Free';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function SettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [plan, setPlan] = useState('Free');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resources, setResources] = useState<AccountResources | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState('');
  const [aiApiKeyMasked, setAiApiKeyMasked] = useState('');
  const [showAiChange, setShowAiChange] = useState(false);
  const [newAiProvider, setNewAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'github-copilot' | ''>('');
  const [newAiApiKey, setNewAiApiKey] = useState('');
  const [aiKeyVerifying, setAiKeyVerifying] = useState(false);
  const [aiKeyVerified, setAiKeyVerified] = useState(false);
  const [aiKeyError, setAiKeyError] = useState<string | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setEmail(data.user.email ?? '');
          setName(data.user.name ?? '');
          setTimezone(data.user.timezone ?? detectedTz);
          setPlan(data.user.plan ?? 'Free');
          setAiProvider(data.user.ai_provider ?? '');
          setAiApiKeyMasked(data.user.ai_api_key ?? '');
        }
      })
      .catch(() => {
        setTimezone(detectedTz);
        setPageError('Failed to load settings');
      })
      .finally(() => setPageLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, timezone }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true);
    setDeleteConfirm('');
    setDeleteError(null);
    setResourcesLoading(true);
    fetch('/api/account/resources')
      .then((res) => res.json())
      .then((data) => setResources(data.resources))
      .catch(() => setResources({ vm: null, telegramBot: null, database: { tables: [] } }))
      .finally(() => setResourcesLoading(false));
  }, []);

  async function handleDelete() {
    if (deleteConfirm !== 'delete my account') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? 'Deletion failed. Please try again.');
        setDeleting(false);
        return;
      }
      router.push('/');
    } catch {
      setDeleteError('Something went wrong. Please try again.');
      setDeleting(false);
    }
  }

  function formatRegion(region: string): string {
    return region.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
  }

  const isPro = plan === 'pro' || plan === 'Pro';
  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none';

  if (pageLoading) {
    return (
      <div className="max-w-2xl space-y-8" data-testid="settings-skeleton">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-800" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-800" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-800" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 animate-pulse rounded bg-slate-800" />
            <div className="h-10 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="max-w-2xl space-y-8" data-testid="settings-error">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-red-400 mb-3">{pageError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Profile - Editable */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Profile</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Display Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">AI Model</label>
          {!showAiChange ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white">
                {aiProvider ? `${aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1)}${aiApiKeyMasked ? ` · ${aiApiKeyMasked}` : ''}` : 'Not configured'}
              </span>
              <button
                onClick={() => { setShowAiChange(true); setNewAiProvider((aiProvider as any) || ''); setNewAiApiKey(''); setAiKeyVerified(false); setAiKeyError(null); }}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['gemini', 'openai', 'anthropic', 'github-copilot'] as const).map((p) => {
                  const isComingSoon = p === 'openai' || p === 'anthropic';
                  return (
                    <button
                      key={p}
                      disabled={isComingSoon}
                      onClick={() => { if (!isComingSoon) { setNewAiProvider(p); setNewAiApiKey(''); setAiKeyVerified(false); setAiKeyError(null); } }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isComingSoon ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' :
                        newAiProvider === p ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {p === 'github-copilot' ? 'GitHub Copilot' : p.charAt(0).toUpperCase() + p.slice(1)}
                      {isComingSoon && <span className="block text-[9px] uppercase tracking-wider text-slate-500">Soon</span>}
                    </button>
                  );
                })}
              </div>
              {newAiProvider && (
                newAiProvider === 'github-copilot' && process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">Sign in with GitHub to connect your Copilot subscription.</p>
                    <a
                      href={`/api/auth/github?returnTo=${encodeURIComponent('/dashboard/settings')}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-sm font-medium text-white transition-colors"
                    >
                      Sign in with GitHub
                    </a>
                  </div>
                ) : (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newAiApiKey}
                    onChange={(e) => { setNewAiApiKey(e.target.value); setAiKeyVerified(false); setAiKeyError(null); }}
                    placeholder={newAiProvider === 'gemini' ? 'AIza...' : newAiProvider === 'openai' ? 'sk-...' : newAiProvider === 'github-copilot' ? 'ghp_... or github_pat_...' : 'sk-ant-...'}
                    className={inputClass}
                  />
                  <button
                    disabled={!newAiApiKey || aiKeyVerifying || aiKeyVerified}
                    onClick={async () => {
                      setAiKeyVerifying(true); setAiKeyError(null);
                      try {
                        const res = await fetch('/api/ai/verify-key', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ provider: newAiProvider, apiKey: newAiApiKey }),
                        });
                        const data = await res.json();
                        if (data.valid) setAiKeyVerified(true);
                        else setAiKeyError(data.error || 'Invalid key');
                      } catch { setAiKeyError('Verification failed'); }
                      setAiKeyVerifying(false);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm text-white transition-colors whitespace-nowrap"
                  >
                    {aiKeyVerifying ? 'Verifying...' : aiKeyVerified ? '✓ Verified' : 'Verify'}
                  </button>
                </div>
              )
              )}
              {aiKeyError && <p className="text-sm text-red-400">{aiKeyError}</p>}
              <div className="flex gap-2">
                <button
                  disabled={!aiKeyVerified || aiSaving}
                  onClick={async () => {
                    setAiSaving(true);
                    await fetch('/api/auth/me', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ai_provider: newAiProvider, ai_api_key: newAiApiKey }),
                    });
                    setAiProvider(newAiProvider);
                    const masked = newAiApiKey.length > 8
                      ? newAiApiKey.slice(0, 4) + '••••••••' + newAiApiKey.slice(-4)
                      : '••••••••';
                    setAiApiKeyMasked(masked);
                    setShowAiChange(false);
                    setAiSaving(false);
                  }}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition"
                >
                  {aiSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAiChange(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Timezone</label>
          <TimezonePicker value={timezone} onChange={setTimezone} />
          {!isPro && (
            <p className="text-xs text-slate-500 mt-1.5">
              Your 8-hour active window is based on this timezone.
              Changing it will shift when your assistant is available.
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </section>

      {/* Account Info - Read-only */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Account</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500 mb-1">Email</p>
            <p className="text-sm text-white">{email}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-1">Plan</p>
            <span className="inline-flex items-center rounded-full bg-violet-600/20 px-3 py-1 text-sm font-medium text-violet-400 border border-violet-500/30">
              {formatPlan(plan)}
            </span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Danger Zone</h2>
        <p className="text-sm text-slate-400">
          Permanently delete your account and all associated data. This will destroy your assistant,
          cancel any active subscription, and remove all your data. This action cannot be undone.
        </p>
        <button
          onClick={openDeleteModal}
          className="rounded-lg border border-red-800/50 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition"
        >
          Delete Account
        </button>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-red-800/40 bg-red-950/30 px-6 py-4 rounded-t-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-400">Delete Your Account</h2>
                <p className="text-sm text-red-400/70">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {resourcesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                  <span className="ml-2 text-sm text-slate-500">Loading account resources...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300">The following resources will be permanently destroyed:</p>
                  <div className="space-y-3">
                    {resources?.vm && (
                      <div className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                        <Monitor className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Azure VM: <code className="text-red-400 font-mono text-xs">{resources.vm.name}</code></p>
                          <p className="text-xs text-slate-400">{formatRegion(resources.vm.region)}{resources.vm.ip ? `, ${resources.vm.ip}` : ''}</p>
                        </div>
                      </div>
                    )}
                    {resources?.telegramBot && (
                      <div className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                        <Bot className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Telegram Bot: <span className="text-red-400">@{resources.telegramBot.username}</span></p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-3">
                      <Database className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                      <div>
                        <p className="text-sm font-medium text-white">All account data, credentials, and configuration</p>
                        {resources?.database?.tables && resources.database.tables.length > 0 && (
                          <p className="text-xs text-slate-400">{resources.database.tables.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {deleteError && (
                    <p className="text-sm text-red-400">{deleteError}</p>
                  )}

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-400 text-xs font-mono">delete my account</code> to confirm:
                    </label>
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="delete my account"
                      disabled={deleting}
                      className="w-full rounded-lg border border-red-800/50 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 disabled:opacity-50"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); setDeleteError(null); }}
                disabled={deleting}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'delete my account' || deleting || resourcesLoading}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
