import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('AppShell', () => {
  it('should render brand, navigation, and page content', () => {
    render(
      <AppShell>
        <div>Overview content</div>
      </AppShell>,
    );

    expect(screen.getByText('ForgeOps')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Engineering automation, governed.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /health/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /repositories/i })).toHaveAttribute(
      'href',
      '/repositories',
    );
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });
});
