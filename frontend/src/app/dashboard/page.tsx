'use client';

import { useRequireAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import eventsService from '@/services/events.service';
import adminTasksService from '@/services/admin-tasks.service';
import volunteersService, { VolunteerProfile } from '@/services/volunteers.service';
import { volunteerApi } from '@/services/volunteer.service';
import { parentLinkService, RequestableCubScoutItem } from '@/services/parentLinkService';
import { hoursPromptService, type ParentPromptItem } from '@/services/hoursPromptService';
import DashboardTaskCard from '@/components/shared/tasks/DashboardTaskCard';
import QuickSignupDialog from '@/components/shared/events/QuickSignupDialog';
import { formatEventTime } from '@/lib/time-format.util';
import { Award, Calendar, CheckSquare, CheckCircle2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  eventDate: string;
  eventTime?: string | null;
  endTime?: string | null;
  fullDay?: boolean;
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

interface DashboardPromptItem {
  id: string;
  childScout: {
    id: string;
    name: string;
  };
  category: ParentPromptItem['category'];
  generatedAt: string;
}

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [linkedCubs, setLinkedCubs] = useState<RequestableCubScoutItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [pendingPrompts, setPendingPrompts] = useState<DashboardPromptItem[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);

  /**
   * Load volunteer profile with badge tier and projected points
   */
  const loadProfile = async () => {
    try {
      const data = await volunteersService.getMyProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadLinkedCubs = useCallback(async () => {
    if (!user) {
      setLinkedCubs([]);
      return;
    }

    try {
      const response = await parentLinkService.getMyLinkedCubScouts();
      setLinkedCubs(response.data || []);
    } catch (error) {
      console.error('Failed to load linked cub scouts:', error);
      setLinkedCubs([]);
    }
  }, [user]);

  const loadPendingPrompts = useCallback(async () => {
    if (!user || (user.authTier !== 'PARENT' && user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
      setPendingPrompts([]);
      return;
    }

    try {
      setLoadingPrompts(true);
      const response = await hoursPromptService.getPrompts({ status: 'PENDING' });
      const sortedPrompts = [...response.data]
        .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime())
        .map((prompt) => ({
          id: prompt.id,
          childScout: prompt.childScout,
          category: prompt.category,
          generatedAt: prompt.generatedAt,
        }));
      setPendingPrompts(sortedPrompts);
    } catch (error) {
      console.error('Failed to load pending prompts:', error);
      setPendingPrompts([]);
    } finally {
      setLoadingPrompts(false);
    }
  }, [user]);

  /**
   * Load upcoming events for display in the dashboard
   * Fetches events with `upcoming: true` and the user's associated dens when available
   */
  const getAssociatedDenIds = useCallback(async (): Promise<string[]> => {
    if (!user) {
      return [];
    }

    if (user.authTier === 'ADMIN') {
      return [];
    }

    if (user.authTier === 'LEADER') {
      const profile = await volunteerApi.getMyProfile();
      return Array.from(
        new Set(
          profile.roles
            .filter((role) => !!role.denId)
            .map((role) => role.denId as string)
        )
      );
    }

    if (user.authTier === 'PARENT') {
      const response = await parentLinkService.getMyLinkedCubScouts();
      return Array.from(
        new Set(
          response.data
            .map((child) => child.currentDen?.id)
            .filter((denId): denId is string => !!denId)
        )
      );
    }

    return [];
  }, [user]);

  const loadUpcomingEvents = useCallback(async () => {
    try {
      const denIds = await getAssociatedDenIds();
      const data = await eventsService.listEvents({
        upcoming: true,
        limit: 5,
        scopeType: 'ALL',
        denIds: denIds.length > 0 ? denIds : undefined,
      });
      setUpcomingEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, [getAssociatedDenIds]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadLinkedCubs();
      loadPendingPrompts();
      loadUpcomingEvents();
      loadUpcomingTasks();
    }
  }, [user, loadLinkedCubs, loadPendingPrompts, loadUpcomingEvents]);

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
   * Handle successful signup - refresh the events list and profile (for projected points)
   */
  const handleSignupSuccess = () => {
    loadUpcomingEvents();
    loadProfile();
    
    // Notify header to refresh points
    window.dispatchEvent(new Event('pointsUpdated'));
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

  const getPromptAgeDays = (generatedAt: string) => {
    const ageMs = Date.now() - new Date(generatedAt).getTime();
    return Math.floor(ageMs / (24 * 60 * 60 * 1000));
  };

  const linkedCubIdSet = useMemo(() => new Set(linkedCubs.map((cub) => cub.id)), [linkedCubs]);
  const parentScopedPrompts = useMemo(
    () => pendingPrompts.filter((prompt) => linkedCubIdSet.has(prompt.childScout.id)),
    [pendingPrompts, linkedCubIdSet],
  );
  const canSeeParentScoutbookActions = linkedCubs.length > 0;
  const canSeeLeaderScoutbookQueue = user?.authTier === 'LEADER' || user?.authTier === 'ADMIN';

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

  if (!user || !profile) {
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
              {user.authTier === 'PARENT' && linkedCubs.length > 0 && (
                <div>
                  <span className="font-medium">Rank(s):</span>{' '}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {linkedCubs.map((cub) => (
                      <span
                        key={cub.id}
                        className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold"
                      >
                        {cub.currentRank}
                        {cub.currentDen?.denNumber ? ` • Den #${cub.currentDen.denNumber}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                  {profile.pointBalance?.currentYearPoints || 0}
                </div>
                <div className="text-sm text-gray-600 mt-2">Points This Year</div>
              </div>
              
              {/* Badge Tier Section */}
              {profile.badgeTier && (
                <div className="border-t pt-3">
                  {profile.badgeTier.current ? (
                    <div className="space-y-2">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                          style={{ 
                            backgroundColor: profile.badgeTier.currentTierDetails?.badgeColor + '20',
                            color: profile.badgeTier.currentTierDetails?.badgeColor,
                            border: `2px solid ${profile.badgeTier.currentTierDetails?.badgeColor}`
                          }}>
                          <Award className="h-4 w-4" />
                          {profile.badgeTier.current} Tier
                        </div>
                      </div>
                      
                      {profile.badgeTier.nextTier && profile.badgeTier.pointsToNextTier !== null && profile.badgeTier.pointsToNextTier > 0 && (
                        <div className="text-center text-sm text-gray-600">
                          <span className="font-medium">{profile.badgeTier.pointsToNextTier}</span> points to <span className="font-medium">{profile.badgeTier.nextTier.tierName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    profile.badgeTier.nextTier && (
                      <div className="text-center text-sm text-gray-600">
                        <span className="font-medium">{profile.badgeTier.pointsToNextTier}</span> points to first badge tier ({profile.badgeTier.nextTier.tierName})
                      </div>
                    )
                  )}
                </div>
              )}
              
              {/* Projected Points Section */}
              {profile.projectedPoints > 0 && (
                <div className="border-t pt-3">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-green-600">
                      +{profile.projectedPoints}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Projected from Signups</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      (Total after events: {(profile.pointBalance?.currentYearPoints || 0) + profile.projectedPoints})
                    </div>
                  </div>
                </div>
              )}
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
                          {(() => {
                            const timeStr = formatEventTime({
                              eventTime: event.eventTime,
                              endTime: event.endTime,
                              fullDay: event.fullDay || false,
                            });
                            return timeStr ? ` • ${timeStr}` : '';
                          })()}
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

            {canSeeParentScoutbookActions && (
              <div className="mb-4 p-3 border rounded-lg bg-amber-50 border-amber-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-amber-900">Parent Scoutbook Actions</p>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-900">
                    {parentScopedPrompts.length} pending
                  </span>
                </div>

                {loadingPrompts ? (
                  <p className="text-xs text-amber-900">Loading Scoutbook prompts...</p>
                ) : parentScopedPrompts.length > 0 ? (
                  <div className="space-y-2">
                    {parentScopedPrompts.slice(0, 3).map((prompt) => {
                      const ageDays = getPromptAgeDays(prompt.generatedAt);
                      const ageClass =
                        ageDays >= 7
                          ? 'text-red-700'
                          : ageDays >= 3
                          ? 'text-amber-700'
                          : 'text-gray-700';

                      return (
                        <div key={prompt.id} className="text-xs flex items-center justify-between gap-2">
                          <Link
                            href={`/parent/scoutbook-prompts?childScoutId=${prompt.childScout.id}`}
                            className="hover:underline text-gray-900"
                          >
                            {prompt.childScout.name} • {prompt.category}
                          </Link>
                          <span className={ageClass}>
                            {ageDays}d
                          </span>
                        </div>
                      );
                    })}

                    <div className="flex gap-2 pt-1">
                      {user.authTier === 'PARENT' && (
                        <Link href="/parent/scoutbook-prompts">
                          <Button variant="outline" size="sm">Open Parent Queue</Button>
                        </Link>
                      )}
                      <Link href="/my-cub-scouts">
                        <Button variant="outline" size="sm">My Cub Scouts</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-900">No pending Scoutbook prompts for your linked Cub Scouts.</p>
                )}
              </div>
            )}

            {canSeeLeaderScoutbookQueue && (
              <div className="mb-4 p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-blue-900">Leader Scoutbook Prompt Queue</p>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-900">
                    {pendingPrompts.length} pending
                  </span>
                </div>

                {loadingPrompts ? (
                  <p className="text-xs text-blue-900">Loading Scoutbook queue...</p>
                ) : pendingPrompts.length > 0 ? (
                  <div className="space-y-2">
                    {pendingPrompts.slice(0, 3).map((prompt) => {
                      const ageDays = getPromptAgeDays(prompt.generatedAt);
                      const ageClass =
                        ageDays >= 7
                          ? 'text-red-700'
                          : ageDays >= 3
                          ? 'text-amber-700'
                          : 'text-gray-700';

                      return (
                        <div key={`leader-${prompt.id}`} className="text-xs flex items-center justify-between gap-2">
                          <Link
                            href={`/parent/scoutbook-prompts?childScoutId=${prompt.childScout.id}`}
                            className="hover:underline text-gray-900"
                          >
                            {prompt.childScout.name} • {prompt.category}
                          </Link>
                          <span className={ageClass}>
                            {ageDays}d
                          </span>
                        </div>
                      );
                    })}

                    <div className="flex gap-2 pt-1">
                      <Link href="/parent/scoutbook-prompts">
                        <Button variant="outline" size="sm">Open Leader Queue</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-blue-900">No pending Scoutbook prompts in leader queue right now.</p>
                )}
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
          currentUserId={user?.signupActorId || user?.id}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
    </div>
  );
}
