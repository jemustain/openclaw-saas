import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => { vi.unstubAllEnvs(); });

describe('admin auth', () => {
  it('getAdminEmails parses comma-separated list', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'a@x.com, B@Y.COM ,c@z.com');
    const { getAdminEmails } = await import('./auth');
    expect(getAdminEmails()).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
  });

  it('getAdminEmails returns empty when not set', async () => {
    delete process.env.ADMIN_EMAILS;
    const { getAdminEmails } = await import('./auth');
    expect(getAdminEmails()).toEqual([]);
  });

  it('isAdmin returns true for admin email', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@x.com');
    const { isAdmin } = await import('./auth');
    expect(isAdmin('ADMIN@x.com')).toBe(true);
  });

  it('isAdmin returns false for non-admin', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@x.com');
    const { isAdmin } = await import('./auth');
    expect(isAdmin('other@x.com')).toBe(false);
  });

  it('isAdmin returns false for null/undefined', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@x.com');
    const { isAdmin } = await import('./auth');
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
