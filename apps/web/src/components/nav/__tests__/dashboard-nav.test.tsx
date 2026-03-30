// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DashboardNav } from '../dashboard-nav';

const mockPush = vi.fn();
let currentPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('lucide-react', () => ({
  LayoutDashboard: (p: any) => React.createElement('span', { 'data-testid': 'icon', className: p.className }),
  Puzzle: (p: any) => React.createElement('span', { 'data-testid': 'icon', className: p.className }),
  Settings: (p: any) => React.createElement('span', { 'data-testid': 'icon', className: p.className }),
  CreditCard: (p: any) => React.createElement('span', { 'data-testid': 'icon', className: p.className }),
  LogOut: (p: any) => React.createElement('span', { 'data-testid': 'icon', className: p.className }),
}));

global.fetch = vi.fn(() => Promise.resolve(new Response()));

describe('DashboardNav', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    currentPathname = '/dashboard';
    document.body.style.overflow = '';
  });

  it('renders all nav links', () => {
    render(<DashboardNav />);
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Skills')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('Billing')).toBeDefined();
  });

  it('renders user name and plan badge', () => {
    render(<DashboardNav userName="Alice" plan="Pro" />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Pro')).toBeDefined();
  });

  it('defaults name to User and plan to Free', () => {
    render(<DashboardNav />);
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getByText('Free')).toBeDefined();
  });

  it('toggles drawer on hamburger click', () => {
    render(<DashboardNav />);
    const toggle = screen.getByTestId('nav-toggle');
    const sidebar = screen.getByTestId('nav-sidebar');
    expect(sidebar.className).toContain('-translate-x-full');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(sidebar.className).not.toContain('-translate-x-full');
    expect(sidebar.className).toContain('translate-x-0');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes drawer when overlay is clicked', () => {
    render(<DashboardNav />);
    fireEvent.click(screen.getByTestId('nav-toggle'));
    fireEvent.click(screen.getByTestId('nav-overlay'));
    expect(screen.getByTestId('nav-sidebar').className).toContain('-translate-x-full');
  });

  it('closes drawer on Escape key', () => {
    render(<DashboardNav />);
    fireEvent.click(screen.getByTestId('nav-toggle'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('nav-sidebar').className).toContain('-translate-x-full');
  });

  it('locks body scroll when drawer is open', () => {
    render(<DashboardNav />);
    fireEvent.click(screen.getByTestId('nav-toggle'));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when drawer closes', () => {
    render(<DashboardNav />);
    fireEvent.click(screen.getByTestId('nav-toggle'));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByTestId('nav-toggle'));
    expect(document.body.style.overflow).toBe('');
  });

  it('nav links have min-h-[44px] for touch targets', () => {
    const { container } = render(<DashboardNav />);
    const navLinks = container.querySelectorAll('nav a');
    expect(navLinks.length).toBe(4);
    navLinks.forEach(link => {
      expect(link.className).toContain('min-h-[44px]');
    });
  });

  it('hamburger button has 44px min touch target', () => {
    render(<DashboardNav />);
    const toggle = screen.getByTestId('nav-toggle');
    expect(toggle.className).toContain('min-h-[44px]');
    expect(toggle.className).toContain('min-w-[44px]');
  });

  it('sign out button has 44px min touch target', () => {
    render(<DashboardNav />);
    const signOutBtn = screen.getByText('Sign Out').closest('button')!;
    expect(signOutBtn.className).toContain('min-h-[44px]');
  });

  it('calls sign out endpoint on click', () => {
    render(<DashboardNav />);
    fireEvent.click(screen.getByText('Sign Out'));
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/signout', { method: 'POST' });
  });

  it('highlights active link based on pathname', () => {
    currentPathname = '/dashboard/skills';
    const { container } = render(<DashboardNav />);
    const navLinks = container.querySelectorAll('nav a');
    const skillsLink = Array.from(navLinks).find(a => a.textContent?.includes('Skills'))!;
    expect(skillsLink.className).toContain('text-violet-300');
    const overviewLink = Array.from(navLinks).find(a => a.textContent?.includes('Overview'))!;
    expect(overviewLink.className).toContain('text-slate-400');
  });

  it('overlay has fade transition classes', () => {
    render(<DashboardNav />);
    const overlay = screen.getByTestId('nav-overlay');
    expect(overlay.className).toContain('transition-opacity');
    expect(overlay.className).toContain('duration-200');
    expect(overlay.className).toContain('opacity-0');
    expect(overlay.className).toContain('pointer-events-none');
  });

  it('sidebar has slide transition classes', () => {
    render(<DashboardNav />);
    const sidebar = screen.getByTestId('nav-sidebar');
    expect(sidebar.className).toContain('transition-transform');
    expect(sidebar.className).toContain('duration-200');
  });
});
