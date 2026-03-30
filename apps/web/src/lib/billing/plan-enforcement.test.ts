import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
          eq: vi.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
    }),
  })),
}));

import { FREE_LIMITS, PRO_LIMITS, getLimitsForPlan, checkMessageLimit, checkPlatformLimit, enforceFreeTierLimits } from './plan-enforcement';

describe('plan-enforcement', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('FREE_LIMITS has expected values', () => {
    expect(FREE_LIMITS.messagesPerDay).toBe(100);
    expect(FREE_LIMITS.hoursPerDay).toBe(8);
  });

  it('PRO_LIMITS has unlimited messages', () => {
    expect(PRO_LIMITS.messagesPerDay).toBe(Infinity);
  });

  it('getLimitsForPlan returns free for unknown plan', () => {
    expect(getLimitsForPlan('unknown')).toEqual(FREE_LIMITS);
  });

  it('getLimitsForPlan returns pro limits', () => {
    expect(getLimitsForPlan('pro')).toEqual(PRO_LIMITS);
  });

  it('checkMessageLimit returns not allowed when no assistant', async () => {
    mockSingle.mockResolvedValue({ data: null });
    const result = await checkMessageLimit('a1');
    expect(result.allowed).toBe(false);
  });

  it('checkMessageLimit returns allowed for free with low usage', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: { messages_sent: 10 } });
    const result = await checkMessageLimit('a1');
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(10);
    expect(result.plan).toBe('free');
  });

  it('checkPlatformLimit returns allowed', async () => {
    mockSingle.mockResolvedValue({ data: { plan: 'free' } });
    const result = await checkPlatformLimit('u1');
    expect(result.allowed).toBe(true);
  });

  it('enforceFreeTierLimits returns allowed when under limits', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'pro' } })
      .mockResolvedValueOnce({ data: { messages_sent: 5 } });
    const result = await enforceFreeTierLimits('a1');
    expect(result.allowed).toBe(true);
  });

  it('enforceFreeTierLimits returns not allowed when message limit reached', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: { messages_sent: 100 } });
    const result = await enforceFreeTierLimits('a1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('message limit');
  });

  it('checkPlatformLimit returns -1 limit for pro', async () => {
    mockSingle.mockResolvedValue({ data: { plan: 'pro' } });
    const result = await checkPlatformLimit('u1');
    expect(result.limit).toBe(-1);
  });

  it('checkPlatformLimit returns numeric limit for free', async () => {
    mockSingle.mockResolvedValue({ data: { plan: 'free' } });
    const result = await checkPlatformLimit('u1');
    expect(result.limit).toBe(1);
  });

  it('enforceFreeTierLimits returns allowed for pro plan (no hours check)', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'pro' } })
      .mockResolvedValueOnce({ data: { messages_sent: 5 } });
    const result = await enforceFreeTierLimits('a1');
    expect(result.allowed).toBe(true);
  });

  it('enforceFreeTierLimits allowed when hours under limit', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: { messages_sent: 5 } })
      .mockResolvedValueOnce({ data: { hours_active: 2 } });
    const result = await enforceFreeTierLimits('a1');
    expect(result.allowed).toBe(true);
  });

  it('enforceFreeTierLimits checks hours with null usage', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: { messages_sent: 5 } })
      .mockResolvedValueOnce({ data: null });
    const result = await enforceFreeTierLimits('a1');
    expect(result.allowed).toBe(true);
  });

  it('checkMessageLimit handles null usage', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'free' } })
      .mockResolvedValueOnce({ data: null });
    const result = await checkMessageLimit('a1');
    expect(result.used).toBe(0);
    expect(result.allowed).toBe(true);
  });

  it('checkMessageLimit returns -1 limit for pro', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: { plan: 'pro' } })
      .mockResolvedValueOnce({ data: { messages_sent: 0 } });
    const result = await checkMessageLimit('a1');
    expect(result.limit).toBe(-1);
  });

  it('checkMessageLimit handles null user plan', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1' } })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { messages_sent: 5 } });
    const result = await checkMessageLimit('a1');
    expect(result.plan).toBe('free');
  });
});
