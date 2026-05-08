/**
 * DashboardTaskCard - Lightweight task card for dashboard display
 * 
 * Displays a task with its due date in a compact format for the dashboard.
 * This component is simplified compared to the full TaskCard component
 * used on the tasks list page.
 * Enhanced with completion flash animation (Feature 007)
 */

import { useState } from 'react';
import Link from 'next/link';

/**
 * Props for DashboardTaskCard component
 */
interface DashboardTaskCardProps {
  /** The task to display */
  task: {
    /** Unique task identifier */
    id: string;
    /** Task name/title */
    name: string;
    /** Due date in ISO 8601 format */
    dueDate: string;
    /** Whether the task is overdue */
    isOverdue: boolean;
    /** Completion record if the user has completed this task */
    currentUserCompletion: { id: string } | null;
  };
  /** Optional callback to handle completion toggle */
  onToggleComplete?: (taskId: string, isComplete: boolean) => Promise<void>;
}

/**
 * Format a date string to a readable format
 * Example: "2026-05-15T18:00:00Z" → "Wed, May 15, 2026"
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function DashboardTaskCard({ task, onToggleComplete }: DashboardTaskCardProps) {
  const isComplete = task.currentUserCompletion !== null;
  const [showFlash, setShowFlash] = useState(false);

  const handleToggleClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking toggle
    e.stopPropagation();
    if (onToggleComplete) {
      const wasComplete = isComplete;
      await onToggleComplete(task.id, isComplete);
      
      // Show success flash when marking as complete
      if (!wasComplete) {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 600);
      }
    }
  };

  return (
    <Link href={`/tasks/${task.id}`}>
      <div 
        className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors relative ${
          showFlash ? 'motion-safe:animate-[success-flash_0.6s_ease-in-out]' : ''
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="font-medium">{task.name}</div>
            <div className="text-sm text-gray-600 mt-1">
              {formatDate(task.dueDate)}
            </div>
            <div className="flex gap-2 mt-2">
              {isComplete && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20">
                  ✓ Complete
                </span>
              )}
              {task.isOverdue && !isComplete && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))] border border-[hsl(var(--danger))]/20">
                  ⚠ Overdue
                </span>
              )}
            </div>
          </div>
          {onToggleComplete && (
            <button
              onClick={handleToggleClick}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isComplete
                  ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
            >
              {isComplete ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Done</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                  <span>Mark Done</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
