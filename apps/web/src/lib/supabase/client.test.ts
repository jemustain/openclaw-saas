import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}));

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('supabase browser client', () => {
  it('creates client when env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    const { createClient } = await import('./client');
    const client = createClient();
    expect(client).toBeDefined();
  });

  it('returns proxy on server when env missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Reset module to clear cached client
    vi.resetModules();
    const { createClient } = await import('./client');
    const client = createClient();
    // Accessing any property on the proxy should throw
    expect(() => (client as any).from('test')).toThrow('Supabase not configured');
  });
});
