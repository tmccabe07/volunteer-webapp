'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AttendanceForm from '@/components/den/AttendanceForm';
import { useAuth } from '@/lib/auth-context';

// Import events service to get event details
import eventsService from '@/services/events.service';
import { denService } from '@/services/den.service';

interface Event {
  id: string;
  title: string;
  scopeType?: 'PACK_WIDE' | 'DEN';
  eventDate: string;
  denId?: string | null;
  rankLevel?: string | null;
  targetDens?: Array<{ denId: string; den: DenOption }>;
  plannedRequirements?: Array<{ requirementId: string }>;
}

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

interface DenOption {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

interface EventAttendancePageProps {
  params: Promise<{ id: string }>;
}

export default function EventAttendancePage({ params }: EventAttendancePageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [dens, setDens] = useState<DenOption[]>([]);
  const [selectedDenId, setSelectedDenId] = useState<string>('');
  const [isLoadingDens, setIsLoadingDens] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setEventId(p.id));
  }, [params]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    // Check if user has Leader+ access
    if (user && user.authTier === 'PARENT') {
      setError('You need Leader or Admin access to record attendance');
      setIsLoading(false);
      return;
    }

    if (user && eventId) {
      loadEvent();
    }
  }, [user, authLoading, eventId, router]);

  const loadEvent = async () => {
    if (!eventId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = (await eventsService.getEvent(eventId)) as Event;
      setEvent(data);

      if (data.scopeType === 'DEN' && (data.targetDens || []).length > 0) {
        const targetDenOptions = (data.targetDens || []).map((target) => target.den);
        setDens(targetDenOptions);
        if (targetDenOptions.length === 1) {
          setSelectedDenId(targetDenOptions[0].id);
        }
      } else if (!data.denId) {
        // If event isn't den-scoped, allow choosing a den for attendance.
        // Rank-scoped events filter dens by rank; pack-wide events show all active dens.
        await loadDensForAttendance(data.rankLevel || undefined);
      } else {
        setDens([]);
        setSelectedDenId('');
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      if (apiError.response?.status === 404) {
        setError('Event not found');
      } else {
        setError(apiError.response?.data?.error || 'Failed to load event');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadDensForAttendance = async (rankLevel?: string) => {
    try {
      setIsLoadingDens(true);
      const response = await denService.listDens({
        ...(rankLevel && { rankLevel }),
        isActive: true,
      });
      setDens(response.data);

      if (response.data.length === 1) {
        setSelectedDenId(response.data[0].id);
      }
    } catch {
      setDens([]);
    } finally {
      setIsLoadingDens(false);
    }
  };

  const handleSuccess = () => {
    if (event) {
      router.push(`/events/${event.id}`);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push('/events')} variant="outline">
              Back to Events
            </Button>
            {error !== 'Event not found' && (
              <Button onClick={loadEvent}>Try Again</Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  // Den resolution for attendance:
  // 1) Use event.denId when present
  // 2) Otherwise, if rank-scoped event, require user den selection
  const resolvedDenId = event.denId || selectedDenId || undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/events/${event.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold">Record Attendance</h1>
        <p className="text-gray-600 mt-2">{event.title}</p>
        <p className="text-sm text-gray-500">
          {new Date(event.eventDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {resolvedDenId ? (
        <AttendanceForm
          eventId={event.id}
          denId={resolvedDenId}
          rankLevel={event.rankLevel || undefined}
          plannedRequirementIds={(event.plannedRequirements || []).map((p) => p.requirementId)}
          onSuccess={handleSuccess}
        />
      ) : (
        <Card className="p-6 space-y-4">
          <p className="font-medium">Select a den for attendance</p>
          {event.rankLevel ? (
            <p className="text-sm text-gray-600">
              This is a rank-scoped event. Choose the specific den roster to record attendance.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              This is a pack-wide event. Choose any active den roster to record attendance.
            </p>
          )}
          <Select
            value={selectedDenId}
            onValueChange={setSelectedDenId}
            disabled={isLoadingDens || dens.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoadingDens
                    ? 'Loading dens...'
                    : dens.length === 0
                    ? 'No active dens found for this rank'
                    : 'Select a den'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {dens.map((den) => (
                <SelectItem key={den.id} value={den.id}>
                  {den.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}
    </div>
  );
}
