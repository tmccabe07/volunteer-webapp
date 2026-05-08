/**
 * Progress Component (shadcn/ui-inspired)
 * 
 * Visual progress bar with variants and optional label display
 * Used for badge progress, event capacity, task completion (Feature 007)
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
  {
    variants: {
      size: {
        sm: 'h-1',
        default: 'h-2',
        lg: 'h-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-[var(--duration-normal)]',
  {
    variants: {
      variant: {
        default: 'bg-[hsl(var(--cub-blue))]',
        success: 'bg-[hsl(var(--success))]',
        warning: 'bg-[hsl(var(--warning))]',
        danger: 'bg-[hsl(var(--danger))]',
        gold: 'bg-[hsl(var(--cub-gold))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  value: number;
  max?: number;
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant, size, showLabel = false, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const isNearGoal = percentage >= 80 && percentage < 100;
    const isComplete = percentage >= 100;

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={cn(
            progressVariants({ size, className }),
            isNearGoal && 'ring-2 ring-[hsl(var(--cub-gold))]/50 ring-offset-1'
          )}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          {...props}
        >
          <div
            className={cn(
              progressIndicatorVariants({ variant }),
              isNearGoal && 'motion-safe:animate-pulse brightness-110',
              isComplete && 'bg-[hsl(var(--success))]'
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>
        {showLabel && (
          <div className={cn(
            "mt-1 text-xs text-right",
            isNearGoal ? "text-[hsl(var(--cub-gold))] font-semibold" : "text-muted-foreground",
            isComplete && "text-[hsl(var(--success))] font-bold"
          )}>
            {value} / {max} ({Math.round(percentage)}%)
            {isNearGoal && !isComplete && ' 🔥'}
            {isComplete && ' ✓'}
          </div>
        )}
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress, progressVariants, progressIndicatorVariants };
