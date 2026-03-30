import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSuspendAssistant = vi.fn();
const mockDestroyAssistant = vi.fn();
const mockOnSubscriptionCancelled = vi.fn().mockResolvedValue(undefined);
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/vm/lifecycle', () => ({
  suspendAssistant: (...a: any[]) => mockSuspendAssistant(...a),
  destroyAssistant: (...a: any[]) => mockDestroyAssistant(...a),
}));

vi.mock('@/lib/email/triggers', () => ({
  onSubscriptionCancelled: (...a: any[]) => mockOnSubscriptionCancelled(...a),
}));

import { handleCancellation, processExpiredGracePeriods } from './cancellation';

describe('cancellation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('handleCancellation updates sub, user, suspends assistant', async () => {
    const mockSubUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) });
    const mockUserUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) });
    const mockAssistantSingle = vi.fn().mockResolvedValue({ data: { id: 'a1', status: 'active' } });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return { update: mockSubUpdate };
      if (table === 'users') return { update: mockUserUpdate };
      if (table === 'assistants') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockAssistantSingle }),
          }),
        }),
      };
      return {};
    });

    mockSuspendAssistant.mockResolvedValue(undefined);
    await handleCancellation('u1');
    expect(mockSuspendAssistant).toHaveBeenCalledWith('a1');
    expect(mockOnSubscriptionCancelled).toHaveBeenCalled();
  });

  it('handleCancellation throws on db error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: { message: 'db error' } }),
        }),
      };
      return {};
    });
    await expect(handleCancellation('u1')).rejects.toEqual({ message: 'db error' });
  });

  it('handleCancellation skips suspend when no assistant', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      };
      if (table === 'users') return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      };
      if (table === 'assistants') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }),
          }),
        }),
      };
      return {};
    });
    await handleCancellation('u1');
    expect(mockSuspendAssistant).not.toHaveBeenCalled();
  });

  it('handleCancellation catches suspend error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      };
      if (table === 'users') return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      };
      if (table === 'assistants') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'a1', status: 'active' } }) }),
          }),
        }),
      };
      return {};
    });
    mockSuspendAssistant.mockRejectedValue(new Error('suspend fail'));
    // Should not throw
    await handleCancellation('u1');
  });

  it('processExpiredGracePeriods returns 0 on query error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      }),
    }));
    const result = await processExpiredGracePeriods();
    expect(result).toEqual({ processed: 0 });
  });

  it('processExpiredGracePeriods returns 0 when none expired', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      }),
    }));
    const result = await processExpiredGracePeriods();
    expect(result).toEqual({ processed: 0 });
  });

  it('processExpiredGracePeriods destroys assistants for expired subs', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({ data: [{ user_id: 'u1' }], error: null }),
                }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ error: null }),
          }),
        };
      }
      if (table === 'assistants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({ data: [{ id: 'a1', status: 'active' }] }),
            }),
          }),
        };
      }
      return {};
    });

    mockDestroyAssistant.mockResolvedValue(undefined);
    const result = await processExpiredGracePeriods();
    expect(result.processed).toBe(1);
    expect(mockDestroyAssistant).toHaveBeenCalledWith('a1');
  });
});
