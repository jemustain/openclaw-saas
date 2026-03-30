import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSign = vi.fn();
const mockJwtVerify = vi.fn();
const mockCookies = vi.fn();

vi.mock('jose', () => ({
  SignJWT: function(this: any) {
    this.setProtectedHeader = () => this;
    this.setExpirationTime = () => this;
    this.setIssuedAt = () => this;
    this.sign = mockSign;
  },
  jwtVerify: (...args: any[]) => mockJwtVerify(...args),
}));

vi.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', 'test-secret-key-at-least-32-chars!!');
});

import { createSession, getSession, destroySession, verifySessionToken } from './session';

describe('session', () => {
  it('createSession sets cookie', async () => {
    const mockSet = vi.fn();
    mockCookies.mockResolvedValue({ set: mockSet });
    mockSign.mockResolvedValue('jwt-token');
    const token = await createSession({ userId: 'u1', email: 'a@b.com', name: 'A' });
    expect(token).toBe('jwt-token');
    expect(mockSet).toHaveBeenCalledWith('session', 'jwt-token', expect.objectContaining({ httpOnly: true }));
  });

  it('getSession returns null when no cookie', async () => {
    mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });
    expect(await getSession()).toBeNull();
  });

  it('getSession returns session from valid token', async () => {
    mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'tok' }) });
    mockJwtVerify.mockResolvedValue({ payload: { userId: 'u1', email: 'a@b.com', name: 'A' } });
    const s = await getSession();
    expect(s).toEqual({ userId: 'u1', email: 'a@b.com', name: 'A' });
  });

  it('getSession returns null on invalid token', async () => {
    mockCookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'bad' }) });
    mockJwtVerify.mockRejectedValue(new Error('invalid'));
    expect(await getSession()).toBeNull();
  });

  it('destroySession clears cookie', async () => {
    const mockSet = vi.fn();
    mockCookies.mockResolvedValue({ set: mockSet });
    await destroySession();
    expect(mockSet).toHaveBeenCalledWith('session', '', expect.objectContaining({ maxAge: 0 }));
  });

  it('verifySessionToken returns session for valid token', async () => {
    mockJwtVerify.mockResolvedValue({ payload: { userId: 'u1', email: 'a@b.com', name: 'A' } });
    const s = await verifySessionToken('tok');
    expect(s).toEqual({ userId: 'u1', email: 'a@b.com', name: 'A' });
  });

  it('verifySessionToken returns null for invalid token', async () => {
    mockJwtVerify.mockRejectedValue(new Error('invalid'));
    expect(await verifySessionToken('bad')).toBeNull();
  });
});
