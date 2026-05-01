'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import EventCard from '@/components/shared/events/EventCard';
import eventsService from '@/services/events.service';
import { useAuth } from '@/lib/auth-context';

const RANK_LEVELS = [
  { value: 'ALL', label: 'All Ranks' },
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

export default function EventsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [events, setEvents] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [rankLevel, setRankLevel] = useState('ALL');
  const [upcoming, setUpcoming] = useState(true);
  const [mySignups, setMySignups] = useState(false);

  const canCreateEvents = user?.authTier === 'LEADER' || user?.authTier === 'ADMIN';

  useEffect(() => {
    loadEvents();
  }, [rankLevel, upcoming, mySignups, pagination.page]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        upcoming,
        mySignups,
      };

      // Only include rankLevel if a specific rank is selected (not 'ALL')
      if (rankLevel && rankLevel !== 'ALL') {
        params.rankLevel = rankLevel;
      }

      const result = await eventsService.listEvents(params);

      setEvents(result.events);
      setPagination(result.pagination);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Volunteer Events</h1>
          <p className="text-gray-600 mt-1">Sign up for events to help your pack and earn points</p>
        </div>
        {canCreateEvents && (
          <Link href="/events/create">
            <Button variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rank Level</label>
            <Select value={rankLevel} onValueChange={setRankLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All ranks" />
              </SelectTrigger>
              <SelectContent>
                {RANK_LEVELS.map(rank => (
                  <SelectItem key={rank.value} value={rank.value}>
                    {rank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <p className="text-gray-500 text-lg">No events found</p>
              <p className="text-gray-400 mt-2">Try adjusting your filters or check back later</p>
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
