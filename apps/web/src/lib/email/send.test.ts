import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: function() {
    this.emails = { send: mockSend };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

import { sendEmail } from './send';

describe('sendEmail', () => {
  it('returns null when no API key', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail('u@t.com', 'Sub', '<p>hi</p>');
    expect(result).toBeNull();
  });

  it('sends email when API key is set', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    mockSend.mockResolvedValue({ data: { id: 'msg1' }, error: null });
    const result = await sendEmail('u@t.com', 'Sub', '<p>hi</p>');
    expect(result).toEqual({ id: 'msg1' });
  });

  it('throws on error', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    mockSend.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await expect(sendEmail('u@t.com', 'Sub', '<p>hi</p>')).rejects.toThrow('Email send failed');
  });
});
