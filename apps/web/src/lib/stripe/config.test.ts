import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => { vi.unstubAllEnvs(); });

describe('stripe config', () => {
  it('PLANS has free and pro', async () => {
    const { PLANS } = await import('./config');
    expect(PLANS.free.priceMonthly).toBe(0);
    expect(PLANS.pro.priceMonthly).toBe(1200);
  });

  it('planKeyFromPriceId returns pro for matching price', async () => {
    vi.stubEnv('STRIPE_PRICE_PRO', 'price_test_123');
    const { planKeyFromPriceId, PLANS } = await import('./config');
    expect(planKeyFromPriceId(PLANS.pro.stripePriceId)).toBe('pro');
  });

  it('planKeyFromPriceId returns null for unknown price', async () => {
    const { planKeyFromPriceId } = await import('./config');
    expect(planKeyFromPriceId('price_unknown')).toBeNull();
  });
});
