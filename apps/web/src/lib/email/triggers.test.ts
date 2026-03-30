import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendEmail = vi.fn().mockResolvedValue({ id: 'e1' });
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    }),
  })),
}));
vi.mock('./send', () => ({ sendEmail: (...args: any[]) => mockSendEmail(...args) }));
vi.mock('./templates', () => ({
  welcomeEmail: (n: string) => '<w>' + n,
  assistantReadyEmail: (n: string) => '<r>' + n,
  paymentFailedEmail: (n: string) => '<f>' + n,
  subscriptionConfirmedEmail: (n: string) => '<c>' + n,
  subscriptionCancelledEmail: (n: string) => '<x>' + n,
  usageLimitEmail: (n: string) => '<l>' + n,
}));

import {
  onUserSignup, onAssistantReady, onPaymentFailed,
  onSubscriptionConfirmed, onSubscriptionCancelled, onUsageLimitReached,
} from './triggers';

describe('email triggers', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('onUserSignup sends welcome', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'j@t.com', name: 'J' } });
    await onUserSignup('u1');
    expect(mockSendEmail).toHaveBeenCalledWith('j@t.com', 'Welcome to ShiftWorker', '<w>J');
  });

  it('onUserSignup skips when no user', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await onUserSignup('u1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('onUserSignup uses email prefix when no name', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'test@x.com', name: null } });
    await onUserSignup('u1');
    expect(mockSendEmail).toHaveBeenCalledWith('test@x.com', 'Welcome to ShiftWorker', '<w>test');
  });

  it('onAssistantReady sends email', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'j@t.com', name: 'J' } });
    await onAssistantReady('u1');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('onAssistantReady skips when no user', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await onAssistantReady('u1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('onPaymentFailed sends email', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'j@t.com', name: 'J' } });
    await onPaymentFailed('u1');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('onPaymentFailed skips when no user', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await onPaymentFailed('u1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('onSubscriptionConfirmed sends email', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'j@t.com', name: 'J' } });
    await onSubscriptionConfirmed('u1');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('onSubscriptionConfirmed skips when no user', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await onSubscriptionConfirmed('u1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('onSubscriptionCancelled sends email', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'j@t.com', name: 'J' } });
    await onSubscriptionCancelled('u1', '2026-05-01');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('onSubscriptionCancelled skips when no user', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await onSubscriptionCancelled('u1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('onUsageLimitReached sends email', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'j@t.com', name: 'J' } });
    await onUsageLimitReached('u1');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('onUsageLimitReached skips when no user', async () => {
    mockSingle.mockResolvedValue({ data: null });
    await onUsageLimitReached('u1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
