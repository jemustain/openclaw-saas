import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.fn();
const mockLaunchAssistant = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
const mockEqStatus = vi.fn().mockReturnValue({ limit: mockLimit });
const mockEqUserId = vi.fn().mockReturnValue({ eq: mockEqStatus });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUserId });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/auth/session', () => ({ getSession: (...a: any[]) => mockGetSession(...a) }));
vi.mock('@/lib/vm/lifecycle', () => ({ launchAssistant: (...a: any[]) => mockLaunchAssistant(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/errors', () => ({
  ERR: { UNAUTHORIZED: 'Unauthorized' },
  apiError: (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'content-type': 'application/json' } }),
  handleApiError: (err: unknown, _ctx: string) =>
    new Response(JSON.stringify({ error: String(err) }), { status: 500 }),
}));

import { POST } from '../launch/route';

describe('POST /api/assistant/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 when user has a suspended assistant', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1' });
    mockSingle.mockResolvedValue({ data: { id: 'a1' } });

    const res = await POST();
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/suspended/i);
    expect(mockLaunchAssistant).not.toHaveBeenCalled();
  });

  it('launches when no suspended assistant exists', async () => {
    mockGetSession.mockResolvedValue({ userId: 'u1' });
    mockSingle.mockResolvedValue({ data: null });
    const fakeAssistant = { id: 'a2', status: 'provisioning' };
    mockLaunchAssistant.mockResolvedValue(fakeAssistant);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assistant).toEqual(fakeAssistant);
  });
});
