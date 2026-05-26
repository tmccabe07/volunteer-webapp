'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { denService, DenListItem } from '@/services/den.service';
import eventsService from '@/services/events.service';
import { childScoutService, ChildScoutListItem } from '@/services/childScout.service';
import { advancementService, PendingReconciliationResponse } from '@/services/advancement.service';
import { volunteerApi } from '@/services/volunteer.service';
import PendingLinksQueue from '@/components/parent/PendingLinksQueue';

interface EventListItem {
  id: string;
  title: string;
  eventDate: string;
  location?: string;
}

export default function MyDensPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [dens, setDens] = useState<DenListItem[]>([]);
  const [selectedDenId, setSelectedDenId] = useState<string>('');

  const [isLoadingDens, setIsLoadingDens] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [denCubs, setDenCubs] = useState<ChildScoutListItem[]>([]);
  const [denEvents, setDenEvents] = useState<EventListItem[]>([]);
  const [pendingReconciliation, setPendingReconciliation] = useState<PendingReconciliationResponse['data']>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user?.authTier === 'PARENT') {
      router.push('/my-cub-scouts');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.authTier === 'PARENT') {
      return;
    }

    const loadDens = async () => {
      setIsLoadingDens(true);
      setError(null);

      try {
        let availableDens: DenListItem[] = [];

        if (user.authTier === 'ADMIN') {
          const response = await denService.listDens({ isActive: true });
          availableDens = response.data;
        } else {
          const profile = await volunteerApi.getMyProfile();
          const uniqueRoleDens = new Map<string, DenListItem>();

          profile.roles.forEach((role) => {
            if (role.denId && role.denName && role.denNumber && role.denRankLevel) {
              uniqueRoleDens.set(role.denId, {
                id: role.denId,
                name: role.denName,
                denNumber: role.denNumber,
                rankLevel: role.denRankLevel,
                isActive: true,
                currentMemberCount: 0,
                leaders: [],
              });
            }
          });

          availableDens = Array.from(uniqueRoleDens.values()).sort((a, b) => a.denNumber - b.denNumber);
        }

        setDens(availableDens);
        setSelectedDenId(availableDens[0]?.id ?? '');
      } catch (err) {
        console.error('Error loading den assignments:', err);
        setError('Unable to load your den assignments right now.');
      } finally {
        setIsLoadingDens(false);
      }
    };

    loadDens();
  }, [user]);

  const selectedDen = useMemo(
    () => dens.find((den) => den.id === selectedDenId) ?? null,
    [dens, selectedDenId],
  );

  useEffect(() => {
    if (!selectedDen) {
      setDenCubs([]);
      setDenEvents([]);
      setPendingReconciliation([]);
      return;
    }

    const loadDenDetails = async () => {
      setIsLoadingDetails(true);
      setError(null);

      try {
        const [cubsResponse, eventsResponse, pendingResponse] = await Promise.all([
          childScoutService.listChildScouts({ denId: selectedDen.id, isActive: true, limit: 100 }),
          eventsService.listEvents({
            scopeType: 'DEN',
            denIds: [selectedDen.id],
            upcoming: true,
            limit: 8,
          }),
          advancementService.getPendingReconciliation({ denId: selectedDen.id }),
        ]);

        setDenCubs(cubsResponse.data);
        setDenEvents((eventsResponse.events ?? []) as EventListItem[]);
        setPendingReconciliation(pendingResponse.data);
      } catch (err) {
        console.error('Error loading den details:', err);
        setError('Unable to load den details right now.');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadDenDetails();
  }, [selectedDen]);

  if (authLoading || isLoadingDens) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">My Dens</h1>
          <p className="text-gray-600 mt-2">
            Manage Cub Scouts, den events, and advancement verification from one place.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label className="block text-sm font-medium mb-2">Active Den</label>
          <Select value={selectedDenId} onValueChange={setSelectedDenId} disabled={dens.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Select a den" />
            </SelectTrigger>
            <SelectContent>
              {dens.map((den) => (
                <SelectItem key={den.id} value={den.id}>
                  {den.name} (#{den.denNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-800">
          {error}
        </Card>
      )}

      {!selectedDen ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">No den assignments found</h2>
          <p className="text-gray-600 mt-2">
            Assign a den leader role to see your dens here.
          </p>
          <div className="mt-4">
            <Link href="/profile">
              <Button variant="outline">Open Profile</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600">Cub Scouts in den</p>
              <p className="text-2xl font-bold mt-1">{denCubs.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Upcoming den events</p>
              <p className="text-2xl font-bold mt-1">{denEvents.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Needs verification</p>
              <p className="text-2xl font-bold mt-1">{pendingReconciliation.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Den rank</p>
              <p className="text-2xl font-bold mt-1">{selectedDen.rankLevel}</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Cub Scouts</h2>
                <Link href={`/dens/${selectedDen.id}/roster`}>
                  <Button variant="outline" size="sm">View Den Roster</Button>
                </Link>
              </div>

              {isLoadingDetails ? (
                <p className="text-gray-600">Loading Cub Scouts...</p>
              ) : denCubs.length === 0 ? (
                <p className="text-gray-600">No active Cub Scouts assigned to this den.</p>
              ) : (
                <ul className="space-y-3">
                  {denCubs.map((cub) => (
                    <li key={cub.id} className="flex items-center justify-between gap-3 border rounded p-3">
                      <div>
                        <p className="font-medium">{cub.firstName} {cub.lastName}</p>
                        <p className="text-sm text-gray-600">{cub.currentRank}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/cubs/${cub.id}`}>
                          <Button variant="outline" size="sm">Profile</Button>
                        </Link>
                        <Link href={`/cubs/${cub.id}/advancement`}>
                          <Button size="sm">Advancement</Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Upcoming Den Events</h2>
                <Link href={`/events?scopeType=DEN&denIds=${selectedDen.id}&upcoming=true`}>
                  <Button variant="outline" size="sm">View All Events</Button>
                </Link>
              </div>

              {isLoadingDetails ? (
                <p className="text-gray-600">Loading events...</p>
              ) : denEvents.length === 0 ? (
                <p className="text-gray-600">No upcoming events for this den.</p>
              ) : (
                <ul className="space-y-3">
                  {denEvents.map((event) => (
                    <li key={event.id} className="border rounded p-3">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.eventDate).toLocaleDateString()}
                        {event.location ? ` • ${event.location}` : ''}
                      </p>
                      <div className="mt-2">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="outline" size="sm">Open Event</Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Verify Completions Queue</h2>
              <Link href={`/advancement/reconciliation?denId=${selectedDen.id}`}>
                <Button>Open Full Queue</Button>
              </Link>
            </div>

            {isLoadingDetails ? (
              <p className="text-gray-600">Loading queue...</p>
            ) : pendingReconciliation.length === 0 ? (
              <p className="text-gray-600">No requirements need verification for this den.</p>
            ) : (
              <ul className="space-y-3">
                {pendingReconciliation.slice(0, 8).map((item) => (
                  <li key={item.id} className="border rounded p-3">
                    <p className="font-medium">{item.childScout.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.requirement.adventureName} • {item.requirement.requirementText}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.daysSinceCompletion} day(s) since completion
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-3">Parent Link Approvals</h2>
            <p className="text-sm text-gray-600 mb-3">
              Review and approve parent-to-Cub Scout link requests for your dens.
            </p>
            <PendingLinksQueue />
          </div>
        </>
      )}
    </div>
  );
}