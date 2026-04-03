/**
 * Header Component
 * 
 * Main site header with pack branding, navigation, and points badge
 */

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pointsService } from '@/services/points.service';
import { BadgeTier } from '@/components/shared/points/BadgeTier';

interface PackConfig {
  packNumber: string;
  packName: string;
}

// Badge colors from BadgeTierService
const badgeTierColors: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Platinum': '#E5E4E2',
  'Diamond': '#B9F2FF'
};

export function Header() {
  const { user, isLoading } = useAuth();
  const [packConfig, setPackConfig] = useState<PackConfig>({
    packNumber: '123',
    packName: 'Pack 123',
  });
  const [points, setPoints] = useState<{
    totalPoints: number;
    badgeTier: string | null;
  } | null>(null);

  // Fetch points data when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
      fetchPoints();
    }
  }, [user, isLoading]);

  const fetchPoints = async () => {
    try {
      const data = await pointsService.getMyPoints(1, 1); // Just need balance, not full history
      setPoints({
        totalPoints: data.balance.totalPoints,
        badgeTier: data.balance.badgeTier
      });
    } catch (error) {
      // Silently fail - points badge is not critical
      console.error('Failed to load points:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">
            🦁 {packConfig.packName}
          </span>
        </Link>
        
        <div className="ml-4 text-sm text-muted-foreground">
          Volunteer Management
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Points Badge */}
        {user && points && (
          <Link href="/points" className="flex items-center gap-3 hover:bg-accent rounded-lg p-2 transition-colors">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="text-sm font-bold">{points.totalPoints}</p>
            </div>
            {points.badgeTier && (
              <BadgeTier
                tierName={points.badgeTier}
                badgeColor={badgeTierColors[points.badgeTier] || '#999999'}
                size="sm"
              />
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
