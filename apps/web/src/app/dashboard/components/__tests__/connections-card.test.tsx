// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionsCardSkeleton } from '../connections-card';

describe('ConnectionsCardSkeleton', () => {
  it('renders skeleton with pulse animations', () => {
    const { container } = render(<ConnectionsCardSkeleton />);
    expect(screen.getByTestId('connections-card-skeleton')).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
