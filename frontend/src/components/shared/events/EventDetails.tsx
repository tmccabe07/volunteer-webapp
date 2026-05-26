'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Award, Clock } from 'lucide-react';
import ActivitySlotList from './ActivitySlotList';
import { formatEventTime } from '@/lib/time-format.util';

interface ActivitySlot {
  id: string;
  activityType: {
    id: string;
    name: string;
    pointValue: number;
    category: string;
  };
  capacity: number | null;
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

interface EventDetailsProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    eventDate: string;
    eventTime: string | null;
    endTime?: string | null;
    fullDay?: boolean;
    location: string | null;
    scopeType?: 'PACK_WIDE' | 'DEN';
    rankLevel: string | null;
    derivedRankLevels?: string[];
    targetDens?: Array<{
      denId: string;
      den: {
        id: string;
        name: string;
        denNumber: number;
        rankLevel: string;
      };
    }>;
    plannedRequirements?: Array<{
      requirementId: string;
      requirement: {
        id: string;
        requirementText: string;
        adventure: {
          id: string;
          name: string;
          rank: {
            rankLevel: string;
          };
        };
      };
    }>;
    childAttendance?: Array<{
      coveredRequirements: Array<{
        id: string;
        requirementText: string;
        adventureName?: string;
      }>;
    }>;
    isRecurring: boolean;
    isComplete: boolean;
    isRetroactive?: boolean;
    recurringEndDate: string | null;
    activitySlots: ActivitySlot[];
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  currentUserId?: string;
  onSignup?: (activitySlotId: string) => Promise<void>;
  onWithdraw?: (activitySlotId: string) => Promise<void>;
}

const RANK_LABELS: Record<string, string> = {
  LION: 'Lion',
  TIGER: 'Tiger',
  WOLF: 'Wolf',
  BEAR: 'Bear',
  WEBELOS: 'Webelos',
  AOL: 'Arrow of Light',
};

export default function EventDetails({ event, currentUserId, onSignup, onWithdraw }: EventDetailsProps) {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isPastEvent = eventDate < new Date();
  const formattedTime = formatEventTime({
    eventTime: event.eventTime,
    endTime: event.endTime,
    fullDay: event.fullDay || false,
  });

  const coveredRequirementMap = new Map<string, { id: string; requirementText: string; adventureName?: string }>();
  for (const attendance of event.childAttendance || []) {
    for (const requirement of attendance.coveredRequirements || []) {
      coveredRequirementMap.set(requirement.id, requirement);
    }
  }
  const coveredRequirements = Array.from(coveredRequirementMap.values());
  const displayRanks = event.derivedRankLevels && event.derivedRankLevels.length > 0
    ? event.derivedRankLevels
    : event.rankLevel
    ? [event.rankLevel]
    : [];

  return (
    <div className="space-y-6">
      {/* Main Event Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl flex items-center gap-3">
                {event.title}
                {event.isRetroactive && (
                  <Badge variant="secondary" className="text-sm">
                    Retroactive
                  </Badge>
                )}
              </CardTitle>
              {event.description && (
                <CardDescription className="mt-2 text-base">
                  {event.description}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              {event.isComplete && (
                <Badge variant="secondary">Completed</Badge>
              )}
              {isPastEvent && !event.isComplete && (
                <Badge variant="destructive">Past</Badge>
              )}
              {event.isRecurring && (
                <Badge variant="outline">Recurring</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formattedDate}</p>
              </div>
            </div>

            {formattedTime && (
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{formattedTime}</p>
                </div>
              </div>
            )}

            {event.location && (
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{event.location}</p>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <Award className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Rank</p>
                <p className="font-medium">
                  {displayRanks.length === 0
                    ? 'Pack-Wide'
                    : displayRanks.length === 1
                    ? RANK_LABELS[displayRanks[0]] || displayRanks[0]
                    : 'Multi-Rank'}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Award className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Scope</p>
                <p className="font-medium">
                  {event.scopeType === 'DEN' ? 'Den-Scoped' : 'Pack-Wide'}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <User className="h-5 w-5 mr-3 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Organizer</p>
                <p className="font-medium">{event.createdBy.name}</p>
              </div>
            </div>

            {event.isRetroactive && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Created On</p>
                  <p className="font-medium">
                    {new Date(event.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {event.scopeType === 'DEN' && (event.targetDens || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Target Dens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {event.targetDens!.map((target) => (
                <Badge key={target.denId} variant="outline">
                  {target.den.name} (#{target.den.denNumber})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(event.plannedRequirements || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planned Requirements</CardTitle>
            <CardDescription>
              Parents and leaders can review planned requirements before the meeting and compare with covered requirements after attendance is submitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {event.plannedRequirements!.map((planned) => (
                <div key={planned.requirementId} className="border rounded-md p-3">
                  <p className="text-sm font-medium">{planned.requirement.adventure.name}</p>
                  <p className="text-sm text-gray-700">{planned.requirement.requirementText}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {coveredRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Covered Requirements</CardTitle>
            <CardDescription>
              Attendance has been recorded for these requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coveredRequirements.map((requirement) => (
                <div key={requirement.id} className="border rounded-md p-3">
                  {requirement.adventureName && (
                    <p className="text-sm font-medium">{requirement.adventureName}</p>
                  )}
                  <p className="text-sm text-gray-700">{requirement.requirementText}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Volunteer Activities</CardTitle>
          <CardDescription>
            Sign up for activities to help with this event and earn points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivitySlotList
            activitySlots={event.activitySlots}
            eventId={event.id}
            currentUserId={currentUserId}
            isComplete={event.isComplete}
            isPastEvent={isPastEvent}
            onSignup={onSignup}
            onWithdraw={onWithdraw}
          />
        </CardContent>
      </Card>
    </div>
  );
}
