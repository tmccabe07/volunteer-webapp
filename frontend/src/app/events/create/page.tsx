'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import EventForm from '@/components/forms/events/EventForm';
import eventsService, { type CreateEventData } from '@/services/events.service';
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

export default function CreateEventPage() {
  const { user } = useAuth();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [availableDens, setAvailableDens] = useState<DenOption[]>([]);
  const [availableRequirements, setAvailableRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/events');
  }

  useEffect(() => {
    loadFormData();
  }, []);

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

  const handleSubmit = async (data: CreateEventData) => {
    await eventsService.createEvent(data);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create Volunteer Event</h1>
      <EventForm
        activityTypes={activityTypes}
        availableDens={availableDens}
        availableRequirements={availableRequirements}
        onSubmit={handleSubmit}
        submitLabel="Create Event"
      />
    </div>
  );
}
