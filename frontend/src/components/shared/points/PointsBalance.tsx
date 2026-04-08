/**
 * PointsBalance Component
 * 
 * Displays current point balance and badge tier
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface PointsBalanceProps {
  totalPoints: number;
  currentYearPoints: number;
  badgeTier: string | null;
  rank: number | null;
  showRank?: boolean;
}

export function PointsBalance({
  totalPoints,
  currentYearPoints,
  badgeTier,
  rank,
  showRank = false
}: PointsBalanceProps) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Points</p>
          <p className="text-3xl font-bold">{totalPoints}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">This Year</p>
          <p className="text-2xl font-semibold">{currentYearPoints}</p>
        </div>

        {badgeTier && (
          <div>
            <p className="text-sm text-muted-foreground">Badge Tier</p>
            <p className="text-xl font-medium">{badgeTier}</p>
          </div>
        )}

        {showRank && rank && (
          <div>
            <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
            <p className="text-xl font-medium">#{rank}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
