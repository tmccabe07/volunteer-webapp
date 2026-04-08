/**
 * BadgeTierLegend Component
 * 
 * Displays all badge tiers with point thresholds and visual representation
 * Helps users understand the gamification progression system
 */

'use client';

import React, { useEffect, useState } from 'react';
import { pointsService, type BadgeTierDefinition } from '@/services/points.service';
import { Card } from '@/components/ui/card';
import { BadgeTier } from '@/components/shared/points/BadgeTier';

interface BadgeTierLegendProps {
  currentTier?: string | null;
  currentPoints?: number;
  compact?: boolean; // Compact view for smaller spaces
}

export function BadgeTierLegend({ 
  currentTier, 
  currentPoints = 0, 
  compact = false 
}: BadgeTierLegendProps) {
  const [tiers, setTiers] = useState<BadgeTierDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      setLoading(true);
      const tierData = await pointsService.getAllBadgeTiers();
      setTiers(tierData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load badge tiers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-3 bg-red-50 border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </Card>
    );
  }

  if (tiers.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground text-sm">
        No badge tiers configured
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Badge Tiers</h4>
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier) => (
            <div 
              key={tier.tierName} 
              className={`flex items-center gap-2 p-2 rounded border ${
                tier.tierName === currentTier 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <BadgeTier
                tierName={tier.tierName}
                badgeColor={tier.badgeColor}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">
                {tier.minPoints}
                {tier.maxPoints !== null ? `-${tier.maxPoints}` : '+'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Badge Tier Progression</h3>
        {currentPoints > 0 && (
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-semibold">{currentPoints} points</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {tiers.map((tier, index) => {
          const isCurrentTier = tier.tierName === currentTier;
          const isAchieved = currentPoints >= tier.minPoints;
          const isNextTier = !isCurrentTier && !isAchieved && 
            (index === 0 || currentPoints >= tiers[index - 1].maxPoints!);

          // Calculate progress to next tier
          let progressPercentage = 0;
          if (isCurrentTier && tier.maxPoints !== null) {
            const tierRange = tier.maxPoints - tier.minPoints;
            const pointsInTier = currentPoints - tier.minPoints;
            progressPercentage = Math.min(100, (pointsInTier / tierRange) * 100);
          }

          return (
            <Card
              key={tier.tierName}
              className={`p-4 transition-all ${
                isCurrentTier 
                  ? 'bg-blue-50 border-blue-300 shadow-md' 
                  : isNextTier
                  ? 'bg-purple-50 border-purple-200'
                  : isAchieved
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Badge Display */}
                <div className="flex-shrink-0">
                  <BadgeTier
                    tierName={tier.tierName}
                    badgeColor={tier.badgeColor}
                    size="md"
                  />
                </div>

                {/* Tier Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg">{tier.tierName}</h4>
                    {isCurrentTier && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">
                        CURRENT
                      </span>
                    )}
                    {isNextTier && (
                      <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full">
                        NEXT
                      </span>
                    )}
                    {isAchieved && !isCurrentTier && (
                      <span className="text-green-600 text-sm">✓ Achieved</span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {tier.minPoints} - {tier.maxPoints !== null ? `${tier.maxPoints}` : '∞'} points
                  </p>

                  {/* Progress Bar for Current Tier */}
                  {isCurrentTier && tier.maxPoints !== null && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tier.maxPoints - currentPoints} points to next tier
                      </p>
                    </div>
                  )}

                  {/* Points to Next Tier */}
                  {isNextTier && (
                    <p className="text-xs text-purple-600 mt-1 font-medium">
                      Earn {tier.minPoints - currentPoints} more points to unlock
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {currentTier 
              ? `You've earned the ${currentTier} badge! Keep volunteering to reach higher tiers.`
              : 'Earn points by volunteering at events and taking on leadership roles!'}
          </p>
        </div>
      </Card>
    </div>
  );
}
