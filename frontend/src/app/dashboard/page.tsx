'use client';

import { useRequireAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import eventsService from '@/services/events.service';
import adminTasksService from '@/services/admin-tasks.service';
import DashboardTaskCard from '@/components/shared/tasks/DashboardTaskCard';

interface Event {
  id: string;
  title: string;
  eventDate: string;
  location?: string;
  rankLevel?: string;
}

interface Task {
  id: string;
  name: string;
  description: string | null;
  dueDate: string;
  isOverdue: boolean;
  isPackWide: boolean;
  assignedRoles: Array<{ id: string; name: string }>;
  currentUserCompletion: { id: string; completedAt: string; isComplete: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();
  const router = useRouter();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUpcomingEvents();
      loadUpcomingTasks();
    }
  }, [user]);

  /**
   * Load upcoming events for display in the dashboard
   * Fetches events with `upcoming: true` filter and limits to 5 results
   */
  const loadUpcomingEvents = async () => {
    try {
      const data = await eventsService.listEvents({ upcoming: true, limit: 5 });
      setUpcomingEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  /**
   * Load upcoming tasks assigned to the current user
   * Fetches incomplete tasks, filters out overdue ones, and limits to 5 results
   * Tasks are sorted by due date (soonest first)
   */
  const loadUpcomingTasks = async () => {
    try {
      const data = await adminTasksService.listTasks({
        assignedToMe: true,
        status: 'incomplete',
        limit: 10,
      });
      // Filter out overdue tasks and limit to 5
      const upcoming = (data.tasks || [])
        .filter((task: Task) => !task.isOverdue)
        .slice(0, 5);
      setUpcomingTasks(upcoming);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  /**
   * Toggle task completion status with optimistic UI updates
   * 
   * Updates the UI immediately for responsive feel, then syncs with the backend.
   * If the API call fails, reverts the optimistic update and shows an error message.
   * 
   * @param taskId - The ID of the task to toggle
   * @param isCurrentlyComplete - Current completion status of the task
   */
  const handleToggleComplete = async (taskId: string, isCurrentlyComplete: boolean) => {
    // Clear any previous errors
    setTaskError(null);

    // Optimistic update: update state immediately
    setUpcomingTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              currentUserCompletion: isCurrentlyComplete
                ? null
                : {
                    id: 'temp-completion',
                    completedAt: new Date().toISOString(),
                    isComplete: true,
                  },
            }
          : task
      )
    );

    try {
      // Call API to persist the change
      if (isCurrentlyComplete) {
        await adminTasksService.uncompleteTask(taskId);
      } else {
        await adminTasksService.completeTask(taskId);
      }
    } catch (error) {
      // Revert optimistic update on error
      setUpcomingTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                currentUserCompletion: isCurrentlyComplete
                  ? {
                      id: 'reverted-completion',
                      completedAt: new Date().toISOString(),
                      isComplete: true,
                    }
                  : null,
              }
            : task
        )
      );
      setTaskError('Failed to update task status. Please try again.');
      console.error('Failed to toggle task completion:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.name}!</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {user.name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              {user.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {user.phone}
                </div>
              )}
              <div>
                <span className="font-medium">Role:</span>{' '}
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                  {user.authTier}
                </span>
              </div>
            </div>
            
            {/* Edit Profile Button */}
            <Button
              variant="outline"
              onClick={() => router.push('/profile/edit')}
              className="mt-4 w-full"
            >
              Edit Profile
            </Button>
          </Card>

          {/* Points Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Points</h2>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {user.pointBalance?.currentYearPoints || 0}
                </div>
                <div className="text-gray-600 text-sm">Points This Year</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-700">
                  {user.pointBalance?.totalPoints || 0}
                </div>
                <div className="text-gray-600 text-sm">Total Points</div>
              </div>
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/events">
                <Button className="w-full" variant="plainoutline">
                  View Events
                </Button>
              </Link>
              <Link href="/tasks">
                <Button className="w-full" variant="plainoutline">
                  My Tasks
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button className="w-full" variant="plainoutline">
                  Leaderboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Placeholder sections */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upcoming Events</h2>
              <Link href="/events">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {loadingEvents ? (
              <p className="text-gray-600 text-sm">Loading events...</p>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(event.eventDate)}
                        {event.location && ` • ${event.location}`}
                      </div>
                      {event.rankLevel && (
                        <div className="text-xs text-gray-500 mt-1">
                          {event.rankLevel}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No upcoming events scheduled.</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upcoming Tasks</h2>
              <Link href="/tasks?assignedToMe=true&status=incomplete">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {taskError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {taskError}
              </div>
            )}
            {loadingTasks ? (
              <p className="text-gray-600 text-sm">Loading tasks...</p>
            ) : upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <DashboardTaskCard 
                    key={task.id} 
                    task={task}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No upcoming tasks.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
