/**
 * DashboardTaskCard - Lightweight task card for dashboard display
 * 
 * Displays a task with its due date in a compact format for the dashboard.
 * This component is simplified compared to the full TaskCard component
 * used on the tasks list page.
 */

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

  const handleToggleClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking toggle
    e.stopPropagation();
    if (onToggleComplete) {
      await onToggleComplete(task.id, isComplete);
    }
  };

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors relative">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="font-medium">{task.name}</div>
            <div className="text-sm text-gray-600 mt-1">
              {formatDate(task.dueDate)}
            </div>
            {isComplete && (
              <div className="text-xs text-green-600 mt-1">
                ✓ Complete
              </div>
            )}
          </div>
          {onToggleComplete && (
            <button
              onClick={handleToggleClick}
              className="flex-shrink-0 mt-1 p-1 hover:bg-gray-100 rounded"
              aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
              title={isComplete ? 'Mark incomplete' : 'Mark complete'}
            >
              {isComplete ? (
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
