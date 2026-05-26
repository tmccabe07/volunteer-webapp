'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import EventForm from '@/components/forms/events/EventForm';
import eventsService, { type UpdateEventData } from '@/services/events.service';
import { denService } from '@/services/den.service';
import { advancementService, type Requirement } from '@/services/advancement.service';
import { volunteerApi } from '@/services/volunteer.service';

interface ActivityType {
  id: string;
  name: string;
  pointValue: number;
  category: string;
}

interface DenOption {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

interface EventDetails {
  title: string;
  description: string | null;
  eventDate: string;
  eventEndDate?: string | null;
  eventTime: string | null;
  endTime: string | null;
  fullDay: boolean;
  location: string | null;
  scopeType?: 'PACK_WIDE' | 'DEN';
  targetDens?: Array<{ denId: string }>;
  rankLevel?: string | null;
  isRecurring: boolean;
  plannedRequirements?: Array<{ requirementId: string }>;
  plannedHourActivities?: {
    camping?: { enabled: boolean; nights?: number };
    hiking?: { enabled: boolean; miles?: number };
    service?: { enabled: boolean; hours?: number };
  } | null;
  activitySlots: Array<{
    activityType: { id: string };
    capacity: number | null;
  }>;
  isComplete: boolean;
}

export default function EditEventPage() {
  const params = useParams();
  const { user } = useAuth();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [availableDens, setAvailableDens] = useState<DenOption[]>([]);
  const [availableRequirements, setAvailableRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/events');
  }

  useEffect(() => {
    Promise.all([loadEvent(), loadFormData()]);
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const data = await eventsService.getEvent(eventId);
      if (data.isComplete) {
        setError('Cannot edit completed events');
      }
      setEvent(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load event';
      setError(message);
    }
  };

  const loadFormData = async () => {
    try {
      const [activityTypeData, requirementsData, densData] = await Promise.all([
        eventsService.getActivityTypes(),
        advancementService.getRequirements(),
        user?.authTier === 'ADMIN'
          ? denService.listDens({ isActive: true })
          : volunteerApi.getMyProfile().then((profile) => {
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
              return { data: Array.from(dens.values()) };
            }),
      ]);

      const sortedDens = [...(densData.data || [])].sort((a, b) => a.denNumber - b.denNumber);

      setAvailableDens(sortedDens);
      setAvailableRequirements(requirementsData.data || []);
      const data = activityTypeData;
      setActivityTypes(data.activityTypes || []);
    } catch (err) {
      console.error('Failed to load event form data:', err);
      setActivityTypes([]);
      setAvailableDens([]);
      setAvailableRequirements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateEventData) => {
    await eventsService.updateEvent(eventId, data);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error || 'Event not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Event</h1>
      <EventForm
        initialData={{
          title: event.title,
          description: event.description || undefined,
          eventDate: new Date(event.eventDate).toISOString().split('T')[0],
          eventEndDate: event.eventEndDate ? new Date(event.eventEndDate).toISOString().split('T')[0] : undefined,
          eventTime: event.eventTime || undefined,
          endTime: event.endTime || undefined,
          fullDay: event.fullDay,
          location: event.location || undefined,
          scopeType: event.scopeType,
          targetDenIds: (event.targetDens || []).map((target) => target.denId),
          isRecurring: event.isRecurring,
          plannedRequirementIds: (event.plannedRequirements || []).map((planned) => planned.requirementId),
          plannedHourActivities: event.plannedHourActivities || undefined,
          activitySlots: event.activitySlots.map((slot) => ({
            activityTypeId: slot.activityType.id,
            capacity: slot.capacity,
          })),
        }}
        activityTypes={activityTypes}
        availableDens={availableDens}
        availableRequirements={availableRequirements}
        onSubmit={handleSubmit}
        submitLabel="Update Event"
      />
    </div>
  );
}
