'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { PlusCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import EventCard from '@/components/shared/events/EventCard';
import eventsService from '@/services/events.service';
import { useAuth } from '@/lib/auth-context';
import { denService } from '@/services/den.service';
import { volunteerApi } from '@/services/volunteer.service';
import { parentLinkService } from '@/services/parentLinkService';
import { authService } from '@/services/auth.service';
import { calendarFeedService, type CalendarFeedDescriptor } from '@/services/calendarFeed.service';
import { CalendarFeedLinksCard } from '@/components/profile/CalendarFeedLinksCard';

interface DenOption {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

interface EventActivitySlot {
  id: string;
  activityType: {
    name: string;
    pointValue: number;
  };
  capacity: number | null;
  signedUpCount: number;
  currentUserSignup: {
    id: string;
    withdrawn: boolean;
  } | null;
}

interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventTime: string | null;
  endTime?: string | null;
  fullDay?: boolean;
  location: string | null;
  rankLevel: string | null;
  derivedRankLevels?: string[];
  isComplete: boolean;
  activitySlots: EventActivitySlot[];
}

const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'All Events' },
  { value: 'PACK_WIDE', label: 'Pack-Wide' },
  { value: 'DEN', label: 'Den-Scoped' },
];

function EventsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableDens, setAvailableDens] = useState<DenOption[]>([]);
  const [selectedDenIds, setSelectedDenIds] = useState<string[]>([]);

  // Filters
  const [scopeType, setScopeType] = useState<'ALL' | 'PACK_WIDE' | 'DEN'>('ALL');
  const [upcoming, setUpcoming] = useState(true);
  const [mySignups, setMySignups] = useState(false);

  const canCreateEvents = user?.authTier === 'LEADER' || user?.authTier === 'ADMIN';

  const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeedDescriptor[]>([]);
  const [calendarFeedsError, setCalendarFeedsError] = useState<string | null>(null);
  const [showCalendarSubscribe, setShowCalendarSubscribe] = useState(false);

  useEffect(() => {
    if (!user) return;
    calendarFeedService.listFeeds()
      .then((feeds) => { setCalendarFeeds(feeds); setCalendarFeedsError(null); })
      .catch(() => { setCalendarFeedsError('Unable to load calendar subscription links'); });
  }, [user]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        if (!user) {
          return;
        }

        if (user.authTier === 'ADMIN') {
          const response = await denService.listDens({ isActive: true });
          const dens = response.data.sort((a, b) => a.denNumber - b.denNumber);
          setAvailableDens(dens);
          setSelectedDenIds(dens.map((den) => den.id));
          return;
        }

        if (user.authTier === 'LEADER') {
          const profile = await volunteerApi.getMyProfile();
          const dens = new Map<string, DenOption>();
          profile.roles.forEach((role) => {
            if (role.denId && role.denName && role.denNumber && role.denRankLevel) {
              dens.set(role.denId, {
                id: role.denId,
                name: role.denName,
                denNumber: role.denNumber,
                rankLevel: role.denRankLevel,
              });
            }
          });

          const denList = Array.from(dens.values()).sort((a, b) => a.denNumber - b.denNumber);
          setAvailableDens(denList);
          setSelectedDenIds(denList.map((den) => den.id));
          return;
        }

        if (user.authTier === 'DEN_CHIEF') {
          const currentUser = await authService.getCurrentUser();
          const denAssignments = ((currentUser as { denAssignments?: Array<{
            denId: string;
            denName: string;
            denNumber: number;
            rankLevel: string;
            validTo: string | null;
          }> }).denAssignments ?? []).filter((assignment) => assignment.validTo === null);

          const denList = denAssignments
            .map((assignment) => ({
              id: assignment.denId,
              name: assignment.denName,
              denNumber: assignment.denNumber,
              rankLevel: assignment.rankLevel,
            }))
            .sort((a, b) => a.denNumber - b.denNumber);

          setAvailableDens(denList);
          setSelectedDenIds(denList.map((den) => den.id));
          return;
        }

        if (user.authTier === 'PARENT') {
          const response = await parentLinkService.getMyLinkedCubScouts();
          const dens = new Map<string, DenOption>();

          response.data.forEach((child) => {
            if (child.currentDen) {
              dens.set(child.currentDen.id, {
                id: child.currentDen.id,
                name: child.currentDen.name,
                denNumber: child.currentDen.denNumber,
                rankLevel: '',
              });
            }
          });

          const denList = Array.from(dens.values()).sort((a, b) => a.denNumber - b.denNumber);
          setAvailableDens(denList);
          setSelectedDenIds(denList.map((den) => den.id));
        }
      } catch (err) {
        console.error('Error loading event filter options:', err);
      }
    };

    loadFilterOptions();
  }, [user]);

  useEffect(() => {
    const requestedScope = searchParams.get('scopeType');
    const requestedDenIds = searchParams
      .getAll('denIds')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean);

    if (requestedScope === 'ALL' || requestedScope === 'PACK_WIDE' || requestedScope === 'DEN') {
      setScopeType(requestedScope);
    }

    if (requestedDenIds.length > 0 && availableDens.length > 0) {
      const availableDenIdSet = new Set(availableDens.map((den) => den.id));
      const filtered = requestedDenIds.filter((denId) => availableDenIdSet.has(denId));
      if (filtered.length > 0) {
        setSelectedDenIds(filtered);
      }
    }
  }, [searchParams, availableDens]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: {
        page: number;
        limit: number;
        scopeType: 'ALL' | 'PACK_WIDE' | 'DEN';
        upcoming: boolean;
        mySignups: boolean;
        denIds?: string[];
      } = {
        page: pagination.page,
        limit: pagination.limit,
        scopeType,
        upcoming,
        mySignups,
      };

      if (scopeType === 'DEN' && selectedDenIds.length > 0) {
        params.denIds = selectedDenIds;
      }

      const result = await eventsService.listEvents(params);

      setEvents(result.events);
      setPagination(result.pagination);
    } catch (err: unknown) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, scopeType, selectedDenIds, upcoming, mySignups]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (scopeType !== 'DEN' || availableDens.length === 0) {
      return;
    }

    if (selectedDenIds.length === 0) {
      setSelectedDenIds(availableDens.map((den) => den.id));
    }
  }, [scopeType, availableDens, selectedDenIds.length]);

  const toggleDen = (denId: string) => {
    setSelectedDenIds((prev) => {
      if (prev.includes(denId)) {
        return prev.filter((id) => id !== denId);
      }
      return [...prev, denId];
    });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-9 w-9 text-[hsl(var(--cub-blue))]" />
            <h1 className="text-4xl font-bold text-gray-900">Volunteer Events</h1>
          </div>
          <p className="text-lg text-gray-600 mt-1">Sign up for events to help your pack and earn points</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCalendarSubscribe((prev) => !prev)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Subscribe to Calendar
            {showCalendarSubscribe ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
          {canCreateEvents && (
            <Link href="/events/create">
              <Button variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showCalendarSubscribe && (
        <div className="mb-6">
          {calendarFeedsError ? (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800">{calendarFeedsError}</p>
            </Card>
          ) : (
            <CalendarFeedLinksCard
              feeds={calendarFeeds}
              onFeedRegenerated={(updatedFeed) => {
                setCalendarFeeds((current) =>
                  current.map((feed) =>
                    feed.scopeType === updatedFeed.scopeType && feed.denId === updatedFeed.denId
                      ? { ...feed, feedUrl: updatedFeed.feedUrl }
                      : feed,
                  ),
                );
              }}
            />
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Scope</label>
            <Select value={scopeType} onValueChange={(value) => setScopeType(value as 'ALL' | 'PACK_WIDE' | 'DEN')}>
              <SelectTrigger>
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((scope) => (
                  <SelectItem key={scope.value} value={scope.value}>
                    {scope.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scopeType === 'DEN' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Dens</label>
              <div className="border rounded-md p-3 space-y-2 max-h-52 overflow-y-auto">
                {availableDens.length === 0 ? (
                  <p className="text-sm text-gray-500">No dens available.</p>
                ) : (
                  availableDens.map((den) => (
                    <label key={den.id} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={selectedDenIds.includes(den.id)}
                        onCheckedChange={() => toggleDen(den.id)}
                      />
                      <span className="text-sm">
                        {den.name} (#{den.denNumber})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={upcoming}
                onChange={(e) => setUpcoming(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Upcoming events only</span>
            </label>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mySignups}
                onChange={(e) => setMySignups(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">My signups</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading events...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-6">
          {error}
        </div>
      )}

      {/* Events grid */}
      {!loading && !error && (
        <>
          {events.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center">
                <div className="text-7xl mb-4">🎪</div>
                <p className="text-gray-700 text-xl font-semibold mb-2">No events found</p>
                <p className="text-gray-500 mb-6">
                    {upcoming ? 'No upcoming events match your filters.' : 'Try adjusting your filters to see more events.'}
                </p>
                {canCreateEvents && (
                  <Link href="/events/create">
                    <Button variant="outline">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create New Event
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventsPage() {
  return <Suspense><EventsPageContent /></Suspense>;
}
