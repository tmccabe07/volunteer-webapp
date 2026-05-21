'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import EventDetails from '@/components/shared/events/EventDetails';
import CompleteEventDialog from '@/components/forms/events/CompleteEventDialog';
import eventsService from '@/services/events.service';
import volunteersService from '@/services/volunteers.service';
import { useAuth } from '@/lib/auth-context';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [allVolunteers, setAllVolunteers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const canEdit = user?.authTier === 'LEADER' || user?.authTier === 'ADMIN';
  const canComplete = canEdit && event && !event.isComplete;

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await eventsService.getEvent(eventId);
      setEvent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (activitySlotId: string) => {
    try {
      await eventsService.signupForActivity(eventId, activitySlotId);
      await loadEvent(); // Reload to show updated signups
      
      // Notify header to refresh points (for projected points)
      window.dispatchEvent(new Event('pointsUpdated'));
    } catch (err: any) {
      throw err; // Let the component handle the error display
    }
  };

  const handleWithdraw = async (activitySlotId: string) => {
    try {
      await eventsService.withdrawFromActivity(eventId, activitySlotId);
      await loadEvent(); // Reload to show updated signups
      
      // Notify header to refresh points (for projected points)
      window.dispatchEvent(new Event('pointsUpdated'));
    } catch (err: any) {
      throw err; // Let the component handle the error display
    }
  };

  const handleComplete = async (data: any) => {
    try {
      await eventsService.completeEvent(eventId, data);
      setShowCompleteDialog(false);
      await loadEvent(); // Reload to show completed status
      
      // Notify header to refresh points (for awarded points)
      window.dispatchEvent(new Event('pointsUpdated'));
    } catch (err: any) {
      throw err; // Let the dialog handle the error display
    }
  };

  const loadAllVolunteers = async () => {
    if (canComplete) {
      try {
        const data = await volunteersService.listAllVolunteers();
        setAllVolunteers(data.volunteers);
      } catch (err: any) {
        console.error('Failed to load volunteers:', err);
        setAllVolunteers([]);
      }
    }
  };

  const handleShowCompleteDialog = () => {
    setShowCompleteDialog(true);
    loadAllVolunteers();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading event...</p>
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
        <Link href="/events">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/events">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>

        <div className="flex gap-2">
          {canComplete && (
            <Button onClick={handleShowCompleteDialog}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          {canEdit && !event.isComplete && (
            <Link href={`/events/${eventId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      <EventDetails
        event={event}
        currentUserId={user?.id}
        onSignup={handleSignup}
        onWithdraw={handleWithdraw}
      />

      {showCompleteDialog && (
        <CompleteEventDialog
          event={event}
          allVolunteers={allVolunteers}
          onComplete={handleComplete}
          onCancel={() => setShowCompleteDialog(false)}
        />
      )}
    </div>
  );
}
