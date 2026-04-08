/**
 * AchievementHistory Component
 * 
 * Displays a timeline of badge tier achievements
 * Shows progression from first badge to current tier
 */

'use client';

import React, { useEffect, useState } from 'react';
import { pointsService, type BadgeTierHistoryEntry } from '@/services/points.service';
import { AchievementBadge } from './AchievementBadge';
import { Card } from '@/components/ui/card';

interface AchievementHistoryProps {
  volunteerId?: string; // Optional: if provided, fetch for specific volunteer (requires Tier 2+)
}

// Default badge colors (from BadgeTierService)
const DEFAULT_BADGE_COLORS: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Platinum': '#E5E4E2',
  'Diamond': '#B9F2FF'
};

export function AchievementHistory({ volunteerId }: AchievementHistoryProps) {
  const [history, setHistory] = useState<BadgeTierHistoryEntry[]>([]);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [volunteerId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // Currently only supports fetching current user's history
      // Backend endpoint: GET /api/badge-tiers/me/history
      const data = await pointsService.getMyBadgeTierHistory();
      setHistory(data.history);
      setCurrentTier(data.currentTier);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load achievement history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          No achievements yet. Earn 20 points to unlock your first badge!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Tier Highlight */}
      {currentTier && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-center">Current Badge Tier</h3>
          <div className="flex justify-center">
            <AchievementBadge
              tierName={currentTier}
              badgeColor={DEFAULT_BADGE_COLORS[currentTier] || '#6B7280'}
              pointsAtChange={history[history.length - 1]?.pointsAtChange || 0}
              size="lg"
              showDetails={false}
            />
          </div>
        </Card>
      )}

      {/* Achievement Timeline */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Achievement Timeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {history.map((achievement) => (
            <div key={achievement.id}>
              <AchievementBadge
                tierName={achievement.newTier}
                badgeColor={DEFAULT_BADGE_COLORS[achievement.newTier] || '#6B7280'}
                pointsAtChange={achievement.pointsAtChange}
                achievedAt={achievement.achievedAt}
                size="md"
                showDetails={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Achievements</p>
            <p className="text-2xl font-bold">{history.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">First Achievement</p>
            <p className="text-sm font-medium">
              {new Date(history[0].achievedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
