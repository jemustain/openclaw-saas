'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TimezonePicker } from '@/components/ui/timezone-picker';

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
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        }
      })
      .catch(() => {
        setTimezone(detectedTz);
      });
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

  async function handleDelete() {
    if (deleteConfirm !== 'DELETE') return;
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

  const isPro = plan === 'pro' || plan === 'Pro';
  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none';

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
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-lg border border-red-800/50 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-800/50 bg-red-950/20 p-4">
            {deleteError && (
              <p className="text-sm text-red-400">{deleteError}</p>
            )}
            <p className="text-sm text-slate-300">Type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-400 text-xs font-mono">DELETE</code> to confirm:</p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              disabled={deleting}
              className="w-full max-w-xs rounded-lg border border-red-800/50 bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none focus:border-red-600 disabled:opacity-50"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); setDeleteError(null); }}
                disabled={deleting}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
