import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navigation } from './navigation';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Navigation', () => {
  it('shows My Cub Scouts link for parent users', () => {
    render(<Navigation userTier={1} userAuthTier="PARENT" />);

    const myCubsLink = screen.getByRole('link', { name: /my cub scouts/i });
    expect(myCubsLink).toHaveAttribute('href', '/my-cub-scouts');
    expect(screen.queryByRole('link', { name: /my dens/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /parent links/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reconciliation/i })).not.toBeInTheDocument();
  });

  it('shows My Dens link for leader users', () => {
    render(<Navigation userTier={2} userAuthTier="LEADER" />);

    const myCubsLink = screen.getByRole('link', { name: /my cub scouts/i });
    const myDensLink = screen.getByRole('link', { name: /my dens/i });
    expect(myCubsLink).toHaveAttribute('href', '/my-cub-scouts');
    expect(myDensLink).toHaveAttribute('href', '/my-dens');
    expect(screen.queryByRole('link', { name: /parent links/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reconciliation/i })).not.toBeInTheDocument();
  });
});
