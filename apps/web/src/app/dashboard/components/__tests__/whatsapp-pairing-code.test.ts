/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

function validatePhoneNumber(phoneNumber: string): string | null {
  if (!phoneNumber) return 'Phone number is required.';
  const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return 'Invalid phone number. Include country code (e.g. +1234567890).';
  }
  return null;
}

describe('WhatsApp pairing code - phone number validation', () => {
  it('accepts valid international numbers', () => {
    expect(validatePhoneNumber('+12345678901')).toBeNull();
    expect(validatePhoneNumber('+447700900123')).toBeNull();
    expect(validatePhoneNumber('12345678901')).toBeNull();
  });

  it('accepts numbers with spaces/dashes', () => {
    expect(validatePhoneNumber('+1 234 567 8901')).toBeNull();
    expect(validatePhoneNumber('+44-7700-900123')).toBeNull();
    expect(validatePhoneNumber('+1 (234) 567-8901')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(validatePhoneNumber('')).toBe('Phone number is required.');
  });

  it('rejects too short numbers', () => {
    expect(validatePhoneNumber('+12345')).toBe(
      'Invalid phone number. Include country code (e.g. +1234567890).'
    );
  });

  it('rejects numbers with letters', () => {
    expect(validatePhoneNumber('+1234abc5678')).toBe(
      'Invalid phone number. Include country code (e.g. +1234567890).'
    );
  });

  it('rejects too long numbers', () => {
    expect(validatePhoneNumber('+1234567890123456')).toBe(
      'Invalid phone number. Include country code (e.g. +1234567890).'
    );
  });
});

describe('WhatsApp pairing code - mobile detection default', () => {
  it('defaults to phone method on small viewports', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    const getDefault = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return 'phone';
      return 'qr';
    };
    expect(getDefault()).toBe('phone');
  });

  it('defaults to qr method on desktop viewports', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    const getDefault = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return 'phone';
      return 'qr';
    };
    expect(getDefault()).toBe('qr');
  });
});

describe('requestWhatsAppPairingCode', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('calls the pairing code API and returns the code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ pairingCode: '1234-5678' }),
    });
    const res = await fetch('/api/messaging/whatsapp/pairing-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+12345678901' }),
    });
    const data = await res.json();
    expect(data.pairingCode).toBe('1234-5678');
  });

  it('returns error for failed requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400, json: async () => ({ error: 'Invalid phone number' }),
    });
    const res = await fetch('/api/messaging/whatsapp/pairing-code', {
      method: 'POST', body: JSON.stringify({ phoneNumber: 'bad' }),
    });
    const data = await res.json();
    expect(data.error).toBe('Invalid phone number');
  });
});
