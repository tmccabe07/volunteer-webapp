'use client';

import { useState, useEffect } from 'react';
import type { ComponentProps } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import EventDetails from '@/components/shared/events/EventDetails';
import NotifyMembersDialog from '@/components/shared/events/NotifyMembersDialog';
import eventsService from '@/services/events.service';
import { attendanceService } from '@/services/attendance.service';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function EventDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const eventId = params.id as string;

  type EventDetailsData = ComponentProps<typeof EventDetails>['event'];
  type EventPageData = EventDetailsData;

  interface ApiError {
    message?: string;
  }

  const [event, setEvent] = useState<EventPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{
    child: {
      id: string;
      firstName: string;
      lastName: string;
    };
    attendanceStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
    coveredRequirements: Array<{
      id: string;
      adventureName: string;
      requirementText: string;
    }>;
    notes?: string | null;
  }>>([]);

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

      if (canEdit) {
        try {
          const attendance = await attendanceService.getEventAttendance(eventId);
          setAttendanceRecords(attendance.attendance || []);
        } catch {
          setAttendanceRecords([]);
        }
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load event');
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
    } catch (err: unknown) {
      throw err; // Let the component handle the error display
    }
  };

  const handleWithdraw = async (activitySlotId: string) => {
    try {
      await eventsService.withdrawFromActivity(eventId, activitySlotId);
      await loadEvent(); // Reload to show updated signups
      
      // Notify header to refresh points (for projected points)
      window.dispatchEvent(new Event('pointsUpdated'));
    } catch (err: unknown) {
      throw err; // Let the component handle the error display
    }
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
          {canEdit && (
            <NotifyMembersDialog eventId={eventId} mode="notify" />
          )}
          {canEdit && event.isComplete && (
            <NotifyMembersDialog eventId={eventId} mode="summary" />
          )}
          {canComplete && (
            <Link href={`/events/${eventId}/closeout`}>
              <Button>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </Link>
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
        currentUserId={user?.signupActorId || user?.id}
        onSignup={handleSignup}
        onWithdraw={handleWithdraw}
      />

      {canEdit && (
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Attendance</h2>
            <Link href={`/events/${eventId}/attendance`}>
              <Button variant="outline" size="sm">Record / Edit Attendance</Button>
            </Link>
          </div>

          {attendanceRecords.length === 0 ? (
            <p className="text-sm text-gray-600">No attendance recorded for this event yet.</p>
          ) : (
            <div className="space-y-2">
              {attendanceRecords.map((record) => (
                <div key={record.child.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/cubs/${record.child.id}`} className="font-medium hover:underline">
                      {record.child.firstName} {record.child.lastName}
                    </Link>
                    {record.coveredRequirements.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Requirements covered: {record.coveredRequirements.length}
                      </p>
                    )}
                    {record.notes && (
                      <p className="text-xs text-gray-600 mt-1">Notes: {record.notes}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      record.attendanceStatus === 'PRESENT'
                        ? 'border-green-300 text-green-700'
                        : record.attendanceStatus === 'ABSENT'
                        ? 'border-red-300 text-red-700'
                        : 'border-amber-300 text-amber-700'
                    }
                  >
                    {record.attendanceStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
