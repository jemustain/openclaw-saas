'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
  { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
  { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
  { value: 'America/Phoenix', label: 'Arizona Time (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
  { value: 'America/Anchorage', label: 'Alaska Time (UTC-9)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (UTC-10)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Central European (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Europe/Moscow', label: 'Moscow (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Asia/Kolkata', label: 'India (UTC+5:30)' },
  { value: 'Asia/Shanghai', label: 'China (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Japan (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (UTC+12)' },
];

function formatPlan(plan: string): string {
  if (!plan) return 'Free';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function SettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [plan, setPlan] = useState('Free');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setEmail(data.user.email ?? '');
          setName(data.user.name ?? '');
          setTimezone(data.user.timezone ?? 'America/New_York');
          setPlan(data.user.plan ?? 'Free');
        }
      })
      .catch(() => {});
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
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/');
  }

  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none';

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Profile */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Profile</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Display Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Email</label>
          <input value={email} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={inputClass}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Current Plan</label>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-violet-600/20 px-3 py-1 text-sm font-medium text-violet-400 border border-violet-500/30">
              {formatPlan(plan)}
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition"
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Danger Zone</h2>
        <p className="text-sm text-slate-400">
          Permanently delete your account and all associated data. This action cannot be undone.
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
            <p className="text-sm text-slate-300">Type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-400 text-xs font-mono">DELETE</code> to confirm:</p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full max-w-xs rounded-lg border border-red-800/50 bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none focus:border-red-600"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                Permanently Delete
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
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
