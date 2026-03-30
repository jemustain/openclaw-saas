import { describe, it, expect } from 'vitest';
import {
  welcomeEmail, assistantReadyEmail, paymentFailedEmail,
  subscriptionConfirmedEmail, subscriptionCancelledEmail, usageLimitEmail,
} from './templates';

describe('email templates', () => {
  it('welcomeEmail contains name and HTML', () => {
    const h = welcomeEmail('Julie');
    expect(h).toContain('Julie');
    expect(h).toContain('<!DOCTYPE html>');
    expect(h).toContain('dashboard');
  });

  it('assistantReadyEmail with all links', () => {
    const h = assistantReadyEmail('Julie', { whatsapp: 'https://wa.me/1', telegram: 'https://t.me/b', slack: 'https://sl.com' });
    expect(h).toContain('wa.me/1');
    expect(h).toContain('t.me/b');
    expect(h).toContain('sl.com');
  });

  it('assistantReadyEmail with no links', () => {
    const h = assistantReadyEmail('Julie', {});
    expect(h).toContain('Julie');
    expect(h).not.toContain('Connect via');
  });

  it('assistantReadyEmail default (no arg)', () => {
    expect(assistantReadyEmail('Julie')).toContain('Julie');
  });

  it('paymentFailedEmail', () => {
    expect(paymentFailedEmail('Julie')).toContain('trouble processing');
  });

  it('subscriptionConfirmedEmail', () => {
    expect(subscriptionConfirmedEmail('Julie')).toContain('Pro');
  });

  it('subscriptionCancelledEmail with date', () => {
    expect(subscriptionCancelledEmail('Julie', '2026-04-30T00:00:00.000Z')).toContain('2026');
  });

  it('subscriptionCancelledEmail without date', () => {
    expect(subscriptionCancelledEmail('Julie')).toContain('30 days from now');
  });

  it('usageLimitEmail', () => {
    expect(usageLimitEmail('Julie')).toContain('daily message limit');
  });
});
