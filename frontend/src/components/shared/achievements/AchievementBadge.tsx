/**
 * AchievementBadge Component
 * 
 * Displays a single achievement badge with tier information
 * Used in profile pages and achievement history
 */

'use client';

import React from 'react';

interface AchievementBadgeProps {
  tierName: string;
  badgeColor: string;
  pointsAtChange: number;
  achievedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const sizeClasses = {
  sm: 'w-16 h-16 text-xs',
  md: 'w-24 h-24 text-sm',
  lg: 'w-32 h-32 text-base'
};

export function AchievementBadge({ 
  tierName, 
  badgeColor, 
  pointsAtChange,
  achievedAt,
  size = 'md',
  showDetails = true
}: AchievementBadgeProps) {
  const formattedDate = achievedAt 
    ? new Date(achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Badge Circle */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-lg border-4 border-white`}
        style={{
          backgroundColor: badgeColor,
        }}
      >
        <div className="text-center">
          <div 
            className="font-bold uppercase tracking-wide"
            style={{
              color: '#ffffff',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {tierName}
          </div>
          {showDetails && size !== 'sm' && (
            <div 
              className="text-xs opacity-90 mt-1"
              style={{
                color: '#ffffff',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              {pointsAtChange} pts
            </div>
          )}
        </div>
      </div>

      {/* Achievement Details */}
      {showDetails && formattedDate && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Earned {formattedDate}
          </p>
        </div>
      )}
    </div>
  );
}
