'use client';

import { useEffect, useState } from 'react';

interface Subscription {
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function BillingPage() {
  const [plan, setPlan] = useState('free');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setPlan(data.user.plan ?? 'free');
          setSubscription(data.user.subscription ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // ignore
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleUpgrade() {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // ignore
    } finally {
      setCheckoutLoading(false);
    }
  }

  const isPro = plan === 'pro' || plan === 'Pro';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isCancelling = isActive && subscription?.cancel_at_period_end === true;

  const periodEndDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Billing</h1>

      {/* Current Plan */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Current Plan</h2>
          {isPro && isActive && !isCancelling && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          )}
          {isCancelling && (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/30">
              Cancelling
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-white">
            {isPro ? 'Pro' : 'Free'}
            {isPro && <span className="ml-2 text-base font-normal text-slate-400">$12/mo</span>}
          </p>
          {isPro ? (
            <p className="text-sm text-slate-400">
              All messengers, pro skills, priority support
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Basic features included
            </p>
          )}
        </div>

        {/* Cancellation notice */}
        {isCancelling && periodEndDate && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-300">Your subscription has been cancelled</p>
            <p className="text-sm text-slate-400 mt-1">
              You&apos;ll continue to have Pro access until <span className="text-white font-medium">{periodEndDate}</span>. After that, your account will switch to the Free plan.
            </p>
          </div>
        )}

        {/* Next billing (only if not cancelling) */}
        {isPro && isActive && !isCancelling && periodEndDate && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-sm text-slate-400">Next billing date</p>
            <p className="text-sm font-medium text-white">{periodEndDate}</p>
          </div>
        )}

        {isPro ? (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition"
          >
            {portalLoading ? 'Loading...' : isCancelling ? 'Reactivate Subscription' : 'Manage Subscription'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-sm font-medium text-violet-300">Upgrade to Pro - $12/mo</p>
              <p className="text-xs text-slate-400 mt-1">
                Unlock all messengers, pro skills, and priority support.
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition"
            >
              {checkoutLoading ? 'Loading...' : 'Upgrade to Pro'}
            </button>
          </div>
        )}
      </section>

      {/* Help */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Need help?</h2>
        <p className="text-sm text-slate-400">
          To cancel or change your subscription, click &quot;Manage Subscription&quot; above to access
          the Stripe Customer Portal. You can update payment methods, change plans, or cancel anytime.
        </p>
      </section>
    </div>
  );
}
