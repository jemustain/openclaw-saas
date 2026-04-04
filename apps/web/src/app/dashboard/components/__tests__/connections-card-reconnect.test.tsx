// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConnectionsCard } from '../connections-card';

describe('ConnectionsCard - Reconnect button styling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Reconnect button with neutral styling when telegram is configured but not connected', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          platforms: {
            telegram: { configured: true, connected: false },
          },
        }),
    }) as any;

    const { container } = render(
      <ConnectionsCard messengers={['telegram']} plan="pro" />
    );

    await waitFor(() => {
      expect(screen.getByText('Reconnect')).toBeTruthy();
    });

    const reconnectBtn = screen.getByText('Reconnect');
    const classes = reconnectBtn.className;

    // Should NOT have amber/warning styling
    expect(classes).not.toContain('bg-amber');

    // Should have neutral slate styling
    expect(classes).toContain('bg-slate-700');
  });
});
