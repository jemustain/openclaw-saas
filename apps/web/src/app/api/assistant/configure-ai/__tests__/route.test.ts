import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js modules
vi.mock('next/server', () => {
  const NextResponse = {
    json: (body: any, init?: any) => ({
      status: init?.status ?? 200,
      json: async () => body,
      ok: (init?.status ?? 200) < 400,
    }),
  };
  return { NextRequest: vi.fn(), NextResponse };
});

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/providers/token-store', () => ({
  getProviderToken: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  apiError: (msg: string, status: number) => ({
    status,
    json: async () => ({ error: msg }),
  }),
  handleApiError: (err: any) => ({
    status: 500,
    json: async () => ({ error: err.message }),
  }),
  ERR: {
    UNAUTHORIZED: 'Unauthorized',
    NO_ACTIVE_ASSISTANT: 'No active assistant',
  },
}));

describe('POST /api/assistant/configure-ai', () => {
  let getSession: any;
  let createClient: any;
  let getProviderToken: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const sessionMod = await import('@/lib/auth/session');
    const supaMod = await import('@/lib/supabase/server');
    const tokenMod = await import('@/lib/providers/token-store');
    getSession = sessionMod.getSession;
    createClient = supaMod.createClient;
    getProviderToken = tokenMod.getProviderToken;
  });

  function makeRequest(body: any) {
    return { json: async () => body } as any;
  }

  it('returns 401 when not authenticated', async () => {
    getSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/assistant/configure-ai/route');
    const res = await POST(makeRequest({ provider: 'gemini' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid provider', async () => {
    getSession.mockResolvedValue({ userId: 'user-1' });
    const { POST } = await import('@/app/api/assistant/configure-ai/route');
    const res = await POST(makeRequest({ provider: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when no active assistant', async () => {
    getSession.mockResolvedValue({ userId: 'user-1' });
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue({ data: null, error: null }),
    };
    createClient.mockReturnValue(mockSupabase);

    const { POST } = await import('@/app/api/assistant/configure-ai/route');
    const res = await POST(makeRequest({ provider: 'gemini', apiKey: 'key-123' }));
    expect(res.status).toBe(404);
  });

  it('fetches github-copilot token when no apiKey provided', async () => {
    getSession.mockResolvedValue({ userId: 'user-1' });
    getProviderToken.mockResolvedValue({ accessToken: 'gho_token' });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue({
        data: { id: 'asst-1', ip_address: '1.2.3.4', sidecar_token: 'tok' },
        error: null,
      }),
    };
    createClient.mockReturnValue(mockSupabase);

    // Mock fetch for sidecar call
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'configured', model: 'github-copilot/claude-sonnet-4' }),
    });

    try {
      const { POST } = await import('@/app/api/assistant/configure-ai/route');
      const res = await POST(makeRequest({ provider: 'github-copilot' }));
      expect(getProviderToken).toHaveBeenCalledWith('user-1', 'github-copilot');
      const body = await res.json();
      expect(body.status).toBe('configured');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
