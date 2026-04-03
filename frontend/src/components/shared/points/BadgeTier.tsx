/**
 * BadgeTier Component
 * 
 * Displays badge tier with color coding
 */

'use client';

import React from 'react';

interface BadgeTierProps {
  tierName: string;
  badgeColor: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-sm px-2 py-1',
  md: 'text-base px-3 py-2',
  lg: 'text-lg px-4 py-3'
};

export function BadgeTier({ tierName, badgeColor, size = 'md' }: BadgeTierProps) {
  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded-full ${sizeClasses[size]}`}
      style={{
        backgroundColor: badgeColor,
        color: '#ffffff',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
      }}
    >
      {tierName}
    </span>
  );
}
