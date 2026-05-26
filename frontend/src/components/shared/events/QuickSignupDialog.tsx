'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Trophy, Users, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import SignupButton from '@/components/forms/events/SignupButton';
import WithdrawButton from '@/components/forms/events/WithdrawButton';
import eventsService from '@/services/events.service';
import Link from 'next/link';

interface ActivitySlotStep {
  id: string;
  orderIndex: number;
  stepText: string;
}

interface ActivitySlot {
  id: string;
  activityType: {
    id: string;
    name: string;
    pointValue: number;
    category: string;
  };
  capacity: number | null;
  description?: string | null;
  steps?: ActivitySlotStep[];
  signups: Array<{
    id: string;
    volunteer: {
      id: string;
      name: string;
    };
    withdrawn: boolean;
    createdAt: string;
  }>;
}

interface EventDetail {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  location: string | null;
  rankLevel: string | null;
  derivedRankLevels?: string[];
  activitySlots: ActivitySlot[];
}

interface ApiError {
  message?: string;
}

interface QuickSignupDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onSignupSuccess?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-purple-100 text-purple-800',
  HIGH: 'bg-orange-100 text-orange-800',
  SPECIAL: 'bg-red-100 text-red-800',
};

const RANK_LABELS: Record<string, string> = {
  LION: 'Lion',
  TIGER: 'Tiger',
  WOLF: 'Wolf',
  BEAR: 'Bear',
  WEBELOS: 'Webelos',
  AOL: 'Arrow of Light',
};

export default function QuickSignupDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  currentUserId,
  onSignupSuccess,
}: QuickSignupDialogProps) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleSteps = (slotId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (open) {
      loadEvent();
    }
  }, [open, eventId]);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await eventsService.getEvent(eventId);
      setEvent(data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (activitySlotId: string) => {
    try {
      await eventsService.signupForActivity(eventId, activitySlotId);
      await loadEvent(); // Reload to show updated signups
      onSignupSuccess?.(); // Notify parent to refresh dashboard
    } catch (err: unknown) {
      throw err; // Let the SignupButton handle the error display
    }
  };

  const handleWithdraw = async (activitySlotId: string) => {
    try {
      await eventsService.withdrawFromActivity(eventId, activitySlotId);
      await loadEvent(); // Reload to show updated signups
      onSignupSuccess?.(); // Notify parent to refresh dashboard
    } catch (err: unknown) {
      throw err; // Let the WithdrawButton handle the error display
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDisplayRanks = () => {
    if (!event) {
      return [] as string[];
    }
    if (event.derivedRankLevels && event.derivedRankLevels.length > 0) {
      return event.derivedRankLevels;
    }
    return event.rankLevel ? [event.rankLevel] : [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">{eventTitle}</DialogTitle>
          <DialogDescription>
            Sign up for volunteer activities to help with this event
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error || !event ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error || 'Failed to load event'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Details Summary */}
            <div className="space-y-3 pb-4 border-b">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium">{formatDate(event.eventDate)}</span>
                {event.eventTime && <span className="ml-2 text-gray-600">at {event.eventTime}</span>}
              </div>

              {event.location && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{event.location}</span>
                </div>
              )}

              {getDisplayRanks().length === 1 && (
                <div className="text-sm">
                  <Badge variant="outline">{RANK_LABELS[getDisplayRanks()[0]] || getDisplayRanks()[0]}</Badge>
                </div>
              )}
              {getDisplayRanks().length > 1 && (
                <div className="text-sm">
                  <Badge variant="outline">Multi-Rank</Badge>
                </div>
              )}
            </div>

            {/* Activity Slots */}
            <div className="space-y-3">
              <h3 className="font-semibold">Available Volunteer Activities</h3>

              {event.activitySlots.length === 0 ? (
                <p className="text-center text-gray-500 py-6">
                  No volunteer activities available for this event yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {event.activitySlots.map((slot) => {
                    const activeSignups = slot.signups.filter((s) => !s.withdrawn);
                    const signedUpCount = activeSignups.length;
                    const currentUserSignup = currentUserId
                      ? slot.signups.find((s) => s.volunteer.id === currentUserId && !s.withdrawn)
                      : null;

                    return (
                      <div key={slot.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{slot.activityType.name}</h4>
                            {slot.description && (
                              <p className="text-sm text-gray-600 mt-1">{slot.description}</p>
                            )}
                            {slot.steps && slot.steps.length > 0 && (
                              <div className="mt-2">
                                <button
                                  onClick={() => toggleSteps(slot.id)}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {expandedSteps.has(slot.id) ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Hide Instructions ({slot.steps.length})
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      View Instructions ({slot.steps.length})
                                    </>
                                  )}
                                </button>
                                {expandedSteps.has(slot.id) && (
                                  <ol className="list-decimal list-inside space-y-1 mt-2 pl-2">
                                    {slot.steps
                                      .sort((a, b) => a.orderIndex - b.orderIndex)
                                      .map((step) => (
                                        <li key={step.id} className="text-sm text-gray-700">
                                          {step.stepText}
                                        </li>
                                      ))}
                                  </ol>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={CATEGORY_COLORS[slot.activityType.category]} variant="secondary">
                                {slot.activityType.category}
                              </Badge>
                              <div className="flex items-center text-sm text-gray-600">
                                <Trophy className="h-3 w-3 mr-1" />
                                {slot.activityType.pointValue} points
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {slot.capacity && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Users className="h-4 w-4 mr-1" />
                                {signedUpCount}/{slot.capacity}
                              </div>
                            )}

                            {currentUserSignup ? (
                              <WithdrawButton
                                activitySlotId={slot.id}
                                eventId={eventId}
                                activityName={slot.activityType.name}
                                onWithdraw={handleWithdraw}
                              />
                            ) : (
                              <SignupButton
                                activitySlotId={slot.id}
                                eventId={eventId}
                                capacity={slot.capacity}
                                signedUpCount={signedUpCount}
                                isSignedUp={false}
                                onSignup={handleSignup}
                              />
                            )}
                          </div>
                        </div>

                        {/* Show volunteers who signed up */}
                        {activeSignups.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500 mb-1">Volunteers:</p>
                            <div className="flex flex-wrap gap-1">
                              {activeSignups.map((signup) => (
                                <Badge key={signup.id} variant="secondary" className="text-xs">
                                  {signup.volunteer.name}
                                  {signup.volunteer.id === currentUserId && ' (You)'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Link to full event details */}
            <div className="pt-4 border-t">
              <Link href={`/events/${eventId}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Event Details
                </Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
