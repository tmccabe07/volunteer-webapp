'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import EventForm from '@/components/forms/events/EventForm';
import eventsService from '@/services/events.service';

export default function EditEventPage() {
  const params = useParams();
  const { user } = useAuth();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any | null>(null);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/events');
  }

  useEffect(() => {
    Promise.all([loadEvent(), loadActivityTypes()]);
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const data = await eventsService.getEvent(eventId);
      if (data.isComplete) {
        setError('Cannot edit completed events');
      }
      setEvent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    }
  };

  const loadActivityTypes = async () => {
    try {
      const data = await eventsService.getActivityTypes();
      setActivityTypes(data.activityTypes || []);
    } catch (err) {
      console.error('Failed to load activity types:', err);
      setActivityTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
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
          description: event.description,
          eventDate: new Date(event.eventDate).toISOString().split('T')[0],
          eventTime: event.eventTime,
          endTime: event.endTime,
          fullDay: event.fullDay,
          location: event.location,
          rankLevel: event.rankLevel,
          isRecurring: event.isRecurring,
          activitySlots: event.activitySlots.map((slot: any) => ({
            activityTypeId: slot.activityType.id,
            capacity: slot.capacity,
          })),
        }}
        activityTypes={activityTypes}
        onSubmit={handleSubmit}
        submitLabel="Update Event"
      />
    </div>
  );
}
