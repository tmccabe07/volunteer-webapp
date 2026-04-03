'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import EventForm from '@/components/forms/events/EventForm';
import eventsService from '@/services/events.service';

export default function CreateEventPage() {
  const { user } = useAuth();
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/events');
  }

  useEffect(() => {
    loadActivityTypes();
  }, []);

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
        onSubmit={handleSubmit}
        submitLabel="Create Event"
      />
    </div>
  );
}
