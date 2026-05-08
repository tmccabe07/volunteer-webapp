/**
 * BadgeTier Component
 * 
 * Displays badge tier with color coding and gold accents for achievements
 * Enhanced with Cub Scout styling and optional progress bar (Feature 007)
 */

'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';

interface BadgeTierProps {
  tierName: string;
  badgeColor: string;
  size?: 'sm' | 'md' | 'lg';
  /** Current points (for progress bar) */
  currentPoints?: number;
  /** Minimum points for this tier */
  minPoints?: number;
  /** Maximum points for this tier (null for highest tier) */
  maxPoints?: number | null;
  /** Show progress bar toward next tier */
  showProgress?: boolean;
}

const sizeClasses = {
  sm: 'text-sm px-2 py-1',
  md: 'text-base px-3 py-2',
  lg: 'text-lg px-4 py-3'
};

export function BadgeTier({ 
  tierName, 
  badgeColor, 
  size = 'md',
  currentPoints,
  minPoints,
  maxPoints,
  showProgress = false
}: BadgeTierProps) {
  // Apply gold accent styling for Gold tier specifically
  const isGoldTier = tierName === 'Gold';
  
  // Calculate progress percentage
  let progressPercentage = 0;
  let pointsNeeded = 0;
  let pointsInTier = 0;
  
  if (showProgress && currentPoints !== undefined && minPoints !== undefined && maxPoints !== null) {
    const tierRange = maxPoints - minPoints;
    pointsInTier = currentPoints - minPoints;
    pointsNeeded = maxPoints - currentPoints;
    progressPercentage = Math.min(100, Math.max(0, (pointsInTier / tierRange) * 100));
  }
  
  return (
    <div className="inline-flex flex-col gap-2 w-full">
      <span
        className={`inline-flex items-center justify-center font-semibold rounded-full transition-all duration-[var(--duration-normal)] ${sizeClasses[size]} ${
          isGoldTier ? 'ring-2 ring-[hsl(var(--cub-gold))] ring-offset-2' : ''
        }`}
        style={{
          backgroundColor: badgeColor,
          color: '#ffffff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          boxShadow: isGoldTier ? '0 4px 6px -1px rgba(251, 191, 36, 0.3)' : undefined,
        }}
      >
        {isGoldTier && <span className="mr-1">✨</span>}
        {tierName}
      </span>
      
      {showProgress && maxPoints !== null && (
        <div className="px-1">
          <Progress 
            value={pointsInTier} 
            max={maxPoints - (minPoints || 0)} 
            variant={isGoldTier ? 'gold' : 'default'}
            size="sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {pointsNeeded > 0 ? `${pointsNeeded} points to next tier` : 'Max tier reached!'}
          </p>
        </div>
      )}
    </div>
  );
}
