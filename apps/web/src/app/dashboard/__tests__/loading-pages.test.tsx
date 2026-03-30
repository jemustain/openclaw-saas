// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DashboardLoading from '../loading';
import SettingsLoading from '../settings/loading';
import BillingLoading from '../billing/loading';

describe('DashboardLoading', () => {
  it('renders skeleton grid matching 3-column layout', () => {
    const { container } = render(<DashboardLoading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(10);
    expect(container.querySelector('.grid')).toBeTruthy();
  });
});

describe('SettingsLoading', () => {
  it('renders skeleton with pulse animations', () => {
    const { container } = render(<SettingsLoading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5);
  });
});

describe('BillingLoading', () => {
  it('renders skeleton with pulse animations', () => {
    const { container } = render(<BillingLoading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5);
  });
});
