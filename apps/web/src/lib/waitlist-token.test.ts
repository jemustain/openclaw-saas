import { describe, it, expect } from 'vitest';
import { generateToken } from './waitlist-token';

describe('generateToken', () => {
  it('returns a 16-char string', async () => {
    const token = await generateToken('test@example.com');
    expect(token).toHaveLength(16);
  });

  it('is deterministic for same email', async () => {
    const a = await generateToken('test@example.com');
    const b = await generateToken('test@example.com');
    expect(a).toBe(b);
  });

  it('differs for different emails', async () => {
    const a = await generateToken('a@x.com');
    const b = await generateToken('b@x.com');
    expect(a).not.toBe(b);
  });
});
