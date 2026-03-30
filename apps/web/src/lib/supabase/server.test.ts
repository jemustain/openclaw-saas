import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
});

describe('supabase server client', () => {
  it('createClient returns supabase client', async () => {
    const { createClient } = await import('./server');
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });
});
