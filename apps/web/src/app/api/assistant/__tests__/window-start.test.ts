import { describe, it, expect } from 'vitest';

describe('default window start calculation', () => {
  it('returns 1 hour before current time, wrapping at midnight', () => {
    const calc = (hour: number) => (hour - 1 + 24) % 24;

    expect(calc(15)).toBe(14); // 3 PM → 2 PM
    expect(calc(0)).toBe(23);  // midnight → 11 PM
    expect(calc(1)).toBe(0);   // 1 AM → midnight
    expect(calc(9)).toBe(8);   // 9 AM → 8 AM
  });
});
