/**
 * Navigation Component
 * 
 * Main navigation menu with tier-based link visibility
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  minTier: number; // Minimum tier required to see this link
}

const navLinks: NavLink[] = [
  { href: '/events', label: 'Events', minTier: 1 },
  { href: '/tasks', label: 'My Tasks', minTier: 1 },
  { href: '/leaderboard', label: 'Leaderboard', minTier: 1 },
  { href: '/profile', label: 'Profile', minTier: 1 },
  { href: '/volunteers', label: 'Volunteers', minTier: 2 },
  { href: '/reports', label: 'Reports', minTier: 2 },
  { href: '/admin-tasks', label: 'Admin Tasks', minTier: 2 },
  { href: '/admin', label: 'Admin', minTier: 3 },
];

interface NavigationProps {
  userTier?: number; // Current user's tier (1-3)
}

export function Navigation({ userTier = 1 }: NavigationProps) {
  const pathname = usePathname();

  // Filter links based on user tier
  const visibleLinks = navLinks.filter((link) => userTier >= link.minTier);

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-12 items-center space-x-4 overflow-x-auto">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center text-sm font-medium transition-colors hover:text-primary',
              pathname.startsWith(link.href)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
