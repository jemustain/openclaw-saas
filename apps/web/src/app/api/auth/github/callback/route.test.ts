import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const mockGetSession = vi.fn();
const mockSaveProviderToken = vi.fn();

vi.mock('@/lib/auth/session', () => ({ getSession: (...a: any[]) => mockGetSession(...a) }));
vi.mock('@/lib/providers/token-store', () => ({ saveProviderToken: (...a: any[]) => mockSaveProviderToken(...a) }));

const SECRET = 'test-client-secret';
const CLIENT_ID = 'test-client-id';

function makeState(overrides: Record<string, unknown> = {}) {
  const payload = JSON.stringify({
    returnTo: '/onboarding?step=7',
    purpose: 'ai-provider',
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
    ...overrides,
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${hmac}`;
}

const fetchMock = vi.fn();

import { GET } from './route';

describe('GitHub OAuth callback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    mockGetSession.mockReset();
    mockSaveProviderToken.mockReset();
    vi.stubEnv('GITHUB_CLIENT_ID', CLIENT_ID);
    vi.stubEnv('GITHUB_CLIENT_SECRET', SECRET);
  });

  function makeReq(params: Record<string, string>) {
    const url = new URL('http://localhost/api/auth/github/callback');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return new Request(url.toString()) as any;
  }

  it('rejects missing state', async () => {
    const res = await GET(makeReq({ code: 'abc' }));
    expect(res.headers.get('location')).toContain('error=invalid_state');
  });

  it('rejects forged state', async () => {
    const res = await GET(makeReq({ code: 'abc', state: 'forged.badhmac' }));
    expect(res.headers.get('location')).toContain('error=invalid_state');
  });

  it('rejects expired state', async () => {
    const state = makeState({ ts: Date.now() - 15 * 60 * 1000 });
    const res = await GET(makeReq({ code: 'abc', state }));
    expect(res.headers.get('location')).toContain('error=invalid_state');
  });

  it('handles error=access_denied from GitHub', async () => {
    const state = makeState();
    const res = await GET(makeReq({ error: 'access_denied', state }));
    expect(res.headers.get('location')).toContain('error=access_denied');
  });

  it('rejects missing code', async () => {
    const state = makeState();
    const res = await GET(makeReq({ state }));
    expect(res.headers.get('location')).toContain('error=missing_code');
  });

  it('handles token exchange failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ error: 'bad_verification_code' }) });
    const state = makeState();
    const res = await GET(makeReq({ code: 'bad', state }));
    expect(res.headers.get('location')).toContain('error=token_exchange');
  });

  it('redirects to login when no session', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) });
    fetchMock.mockResolvedValueOnce({ ok: true });
    mockGetSession.mockResolvedValue(null);
    const state = makeState();
    const res = await GET(makeReq({ code: 'good', state }));
    expect(res.headers.get('location')).toContain('/login');
  });

  it('saves encrypted token and redirects on success', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'ghu_abc' }) });
    fetchMock.mockResolvedValueOnce({ ok: true });
    mockGetSession.mockResolvedValue({ userId: 'u1' });
    mockSaveProviderToken.mockResolvedValue(undefined);
    const state = makeState({ returnTo: '/dash' });
    const res = await GET(makeReq({ code: 'good', state }));
    const loc = res.headers.get('location')!;
    expect(loc).toContain('/dash');
    expect(loc).toContain('github=connected');
    expect(mockSaveProviderToken).toHaveBeenCalledWith('u1', 'github-copilot', 'ghu_abc', null, null);
  });

  it('adds copilot_warning when verification fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'ghu_abc' }) });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    mockGetSession.mockResolvedValue({ userId: 'u1' });
    mockSaveProviderToken.mockResolvedValue(undefined);
    const state = makeState({ returnTo: '/dash' });
    const res = await GET(makeReq({ code: 'good', state }));
    expect(res.headers.get('location')).toContain('copilot_warning=true');
  });
});
