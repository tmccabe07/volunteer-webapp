/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner component with different sizes and optional text
 * Uses TailwindCSS for styling
 * 
 * Usage:
 * <LoadingSpinner /> - Default size
 * <LoadingSpinner size="sm" /> - Small spinner
 * <LoadingSpinner size="lg" text="Loading data..." /> - Large spinner with text
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  text,
  className = '',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-blue-600 border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {spinner}
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Page-level loading component
 * Centers the spinner in a full-height container
 */
export function PageLoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" text={text || 'Loading...'} />
    </div>
  );
}

/**
 * Inline loading component
 * For use within buttons or small sections
 */
export function InlineLoadingSpinner({ text }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoadingSpinner size="sm" />
      {text && <span className="text-sm">{text}</span>}
    </span>
  );
}

/**
 * Loading skeleton for content placeholders
 * Useful while content is loading
 */
export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

/**
 * Card skeleton for loading card content
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <LoadingSkeleton className="mb-4 h-6 w-3/4" />
      <LoadingSkeleton className="mb-2 h-4 w-full" />
      <LoadingSkeleton className="mb-2 h-4 w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
    </div>
  );
}

/**
 * Table skeleton for loading table content
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <LoadingSkeleton key={`header-${i}`} className="h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
