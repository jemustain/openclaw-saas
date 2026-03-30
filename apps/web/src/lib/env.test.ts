import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => { vi.unstubAllEnvs(); });

describe('env', () => {
  it('returns trimmed value', async () => {
    vi.stubEnv('TEST_VAR', '  hello  ');
    const { env } = await import('./env');
    expect(env('TEST_VAR')).toBe('hello');
  });

  it('returns undefined for missing var', async () => {
    const { env } = await import('./env');
    expect(env('TOTALLY_MISSING_VAR_XYZ')).toBeUndefined();
  });

  it('returns undefined for empty string', async () => {
    vi.stubEnv('EMPTY_VAR', '');
    const { env } = await import('./env');
    expect(env('EMPTY_VAR')).toBeUndefined();
  });

  it('envRequired returns value when set', async () => {
    vi.stubEnv('REQ_VAR', 'value');
    const { envRequired } = await import('./env');
    expect(envRequired('REQ_VAR')).toBe('value');
  });

  it('envRequired throws when missing', async () => {
    const { envRequired } = await import('./env');
    expect(() => envRequired('MISSING_REQ_VAR_XYZ')).toThrow('Missing required environment variable');
  });
});
