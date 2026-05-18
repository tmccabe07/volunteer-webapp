'use client';

import { useRequireAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import eventsService from '@/services/events.service';
import adminTasksService from '@/services/admin-tasks.service';
import DashboardTaskCard from '@/components/shared/tasks/DashboardTaskCard';
import QuickSignupDialog from '@/components/shared/events/QuickSignupDialog';
import { Award, Calendar, CheckSquare, CheckCircle2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  eventDate: string;
  location?: string;
  rankLevel?: string;
  activitySlots?: Array<{
    id: string;
    currentUserSignup: { id: string; withdrawn: boolean } | null;
  }>;
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
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);

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
   * Load tasks assigned to the current user
   * Fetches incomplete tasks (including overdue) and limits to 5 results
   * Tasks are sorted by due date (soonest first)
   */
  const loadUpcomingTasks = async () => {
    try {
      const data = await adminTasksService.listTasks({
        assignedToMe: true,
        status: 'incomplete',
        limit: 5,
      });
      // Take all tasks (including overdue), limit to 5
      const myTasks = (data.tasks || []).slice(0, 5);
      setUpcomingTasks(myTasks);
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

  /**
   * Open the quick signup dialog for a specific event
   * 
   * @param eventId - The ID of the event
   * @param eventTitle - The title of the event
   */
  const handleOpenSignupDialog = (eventId: string, eventTitle: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the button
    e.stopPropagation();
    setSelectedEvent({ id: eventId, title: eventTitle });
    setSignupDialogOpen(true);
  };

  /**
   * Handle successful signup - refresh the events list
   */
  const handleSignupSuccess = () => {
    loadUpcomingEvents();
  };

  /**
   * Get signup status for an event
   * Returns the count of activity slots the user has signed up for
   */
  const getSignupStatus = (event: Event): { signedUp: number; total: number } => {
    if (!event.activitySlots || event.activitySlots.length === 0) {
      return { signedUp: 0, total: 0 };
    }

    const signedUp = event.activitySlots.filter(
      slot => slot.currentUserSignup && !slot.currentUserSignup.withdrawn
    ).length;

    return {
      signedUp,
      total: event.activitySlots.length,
    };
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
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-48" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Card Skeleton */}
            <Card className="p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </Card>

            {/* Points Card Skeleton */}
            <Card className="p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="text-center space-y-4">
                <Skeleton className="h-16 w-32 mx-auto" />
                <Skeleton className="h-4 w-40 mx-auto" />
                <Skeleton className="h-12 w-24 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            </Card>

            {/* Quick Actions Skeleton */}
            <Card className="p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          </div>

          {/* Events Section Skeleton */}
          <div className="mt-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          </div>

          {/* Tasks Section Skeleton */}
          <div className="mt-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect
  }

  return (
    <div className="bg-gray-50 min-h-screen animate-fade-in">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">Welcome back, {user.name}!</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Info Card - Featured */}
          <Card className="p-6 border-l-4 border-l-[hsl(var(--cub-blue))] shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
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
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-[hsl(var(--cub-gold))]" />
              <h2 className="text-2xl font-semibold">Your Points</h2>
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-[hsl(var(--cub-blue))]">
                  {user.pointBalance?.currentYearPoints || 0}
                </div>
                <div className="text-sm text-gray-600 mt-2">Points This Year</div>
              </div>
              <div className="text-center border-t pt-3">
                <div className="text-3xl font-semibold text-gray-700">
                  {user.pointBalance?.totalPoints || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Points</div>
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
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[hsl(var(--cub-blue))]" />
                <h2 className="text-xl font-semibold">Upcoming Events</h2>
              </div>
              <Link href="/events">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {loadingEvents ? (
              <p className="text-gray-600 text-sm">Loading events...</p>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const signupStatus = getSignupStatus(event);
                  const hasSignups = signupStatus.signedUp > 0;
                  const isFullySignedUp = signupStatus.signedUp === signupStatus.total && signupStatus.total > 0;

                  return (
                    <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Link href={`/events/${event.id}`} className="block mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium hover:text-[hsl(var(--cub-blue))] transition-colors flex-1">
                            {event.title}
                          </div>
                          {hasSignups && (
                            <Badge 
                              variant={isFullySignedUp ? "default" : "secondary"}
                              className={isFullySignedUp ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {signupStatus.signedUp}/{signupStatus.total}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatDate(event.eventDate)}
                          {event.location && ` • ${event.location}`}
                        </div>
                        {event.rankLevel && (
                          <div className="text-xs text-gray-500 mt-1">
                            {event.rankLevel}
                          </div>
                        )}
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={(e) => handleOpenSignupDialog(event.id, event.title, e)}
                      >
                        {hasSignups ? 'Manage Signups' : 'Sign Up'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-6xl mb-3">📅</div>
                <p className="text-gray-700 font-medium mb-1">No upcoming events</p>
                <p className="text-sm text-gray-500 mb-4">Check back later for new volunteer opportunities!</p>
                <Link href="/events">
                  <Button variant="outline" size="sm">Browse All Events</Button>
                </Link>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-[hsl(var(--cub-blue))]" />
                <h2 className="text-xl font-semibold">My Tasks</h2>
              </div>
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-6xl mb-3">✅</div>
                <p className="text-gray-700 font-medium mb-1">All caught up!</p>
                <p className="text-sm text-gray-500 mb-4">You have no pending tasks. Great work!</p>
                <Link href="/tasks">
                  <Button variant="outline" size="sm">View All Tasks</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Signup Dialog */}
      {selectedEvent && (
        <QuickSignupDialog
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          open={signupDialogOpen}
          onOpenChange={setSignupDialogOpen}
          currentUserId={user?.id}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
    </div>
  );
}
