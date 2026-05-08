/**
 * Skeleton Component (shadcn/ui)
 * 
 * Loading placeholder with animated pulse effect
 * Used for skeleton screens while content is loading (Feature 007)
 */

import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
