// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { UsageCard, UsageCardSkeleton } from '../usage-card';

const mockFetch = vi.fn();
global.fetch = mockFetch;

afterEach(() => {
  cleanup();
});

describe('UsageCardSkeleton', () => {
  it('renders skeleton with pulse animations', () => {
    const { container } = render(<UsageCardSkeleton />);
    expect(screen.getByTestId('usage-card-skeleton')).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('UsageCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it('shows skeleton while loading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<UsageCard />);
    expect(screen.getByTestId('usage-card-skeleton')).toBeTruthy();
  });

  it('shows data after successful fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        messages_today: 42,
        messages_limit: 100,
        hours_active: 3.5,
        hours_limit: 8,
        plan: 'free',
      }),
    });

    render(<UsageCard />);
    await waitFor(() => {
      expect(screen.getByText(/42/)).toBeTruthy();
    });
    expect(screen.getByText(/free plan/i)).toBeTruthy();
  });
});
