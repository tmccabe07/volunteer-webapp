/**
 * Navigation Component
 * 
 * Main navigation menu with tier-based link visibility
 * Enhanced with icons and active state highlighting (Feature 007)
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Trophy, 
  Bell, 
  User, 
  Users, 
  FileText, 
  Settings,
  Shield,
  Award,
  LucideIcon
} from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  minTier: number; // Minimum tier required to see this link
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minTier: 1 },
  { href: '/events', label: 'Events', icon: Calendar, minTier: 1 },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, minTier: 1 },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, minTier: 1 },
  { href: '/notifications', label: 'Notifications', icon: Bell, minTier: 1 },
  { href: '/profile', label: 'Profile', icon: User, minTier: 1 },
  { href: '/volunteers', label: 'Volunteers', icon: Users, minTier: 2 },
  { href: '/reports', label: 'Reports', icon: FileText, minTier: 2 },
  { href: '/admin/config', label: 'Pack Config', icon: Settings, minTier: 3 },
  { href: '/admin/roles', label: 'Roles', icon: Shield, minTier: 3 },
  { href: '/admin/activities', label: 'Activities', icon: Award, minTier: 3 },
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
      <div className="container flex h-14 items-center space-x-1 overflow-x-auto">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-[var(--duration-normal)]',
                isActive
                  ? 'bg-[hsl(var(--cub-blue))]/10 text-[hsl(var(--cub-blue))] border-b-2 border-b-[hsl(var(--cub-blue))]'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
