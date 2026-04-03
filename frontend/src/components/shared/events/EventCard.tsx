'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Award } from 'lucide-react';

interface ActivitySlot {
  id: string;
  activityType: {
    name: string;
    pointValue: number;
  };
  capacity: number | null;
  signedUpCount: number;
  currentUserSignup: {
    id: string;
    withdrawn: boolean;
  } | null;
}

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    eventDate: string;
    eventTime: string | null;
    location: string | null;
    rankLevel: string | null;
    isComplete: boolean;
    activitySlots: ActivitySlot[];
  };
}

const RANK_LABELS: Record<string, string> = {
  LION: 'Lion',
  TIGER: 'Tiger',
  WOLF: 'Wolf',
  BEAR: 'Bear',
  WEBELOS: 'Webelos',
  AOL: 'Arrow of Light',
};

export default function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalCapacity = event.activitySlots.reduce((sum, slot) => {
    return slot.capacity ? sum + slot.capacity : sum;
  }, 0);

  const totalSignups = event.activitySlots.reduce((sum, slot) => {
    return sum + slot.signedUpCount;
  }, 0);

  const hasCapacity = event.activitySlots.some(slot => slot.capacity !== null);
  const isSignedUp = event.activitySlots.some(slot => slot.currentUserSignup !== null);

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <CardDescription className="mt-1">
                {event.description || 'No description provided'}
              </CardDescription>
            </div>
            {event.isComplete && (
              <Badge variant="secondary">Completed</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            {formattedDate}
            {event.eventTime && ` at ${event.eventTime}`}
          </div>

          {event.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              {event.location}
            </div>
          )}

          <div className="flex items-center gap-2">
            {event.rankLevel && (
              <Badge variant="outline">
                {RANK_LABELS[event.rankLevel] || event.rankLevel}
              </Badge>
            )}
            {!event.rankLevel && (
              <Badge variant="outline">Pack-Wide</Badge>
            )}
            {isSignedUp && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                ✓ Signed Up
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center text-sm text-gray-600">
              <Award className="h-4 w-4 mr-2" />
              {event.activitySlots.length} {event.activitySlots.length === 1 ? 'activity' : 'activities'}
            </div>

            {hasCapacity && (
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {totalSignups}/{totalCapacity} volunteers
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
