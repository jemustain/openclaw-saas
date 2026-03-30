import { describe, it, expect } from 'vitest';
import { waitlistWelcomeEmail } from './waitlist-welcome';

describe('waitlistWelcomeEmail', () => {
  it('returns subject and html', () => {
    const result = waitlistWelcomeEmail({ unsubscribeUrl: 'https://example.com/unsub' });
    expect(result.subject).toBe("You're on the list");
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('https://example.com/unsub');
    expect(result.html).toContain('ShiftWorker');
  });
});
