import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('stripe', () => ({
  default: function() {
    this.customers = { list: vi.fn() };
  },
}));

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
});

describe('stripe client', () => {
  it('getStripe returns a Stripe instance', async () => {
    const { getStripe } = await import('./client');
    const s = getStripe();
    expect(s).toBeDefined();
    expect(s.customers).toBeDefined();
  });

  it('stripe proxy delegates to getStripe', async () => {
    const { stripe } = await import('./client');
    expect(stripe.customers).toBeDefined();
  });
});
