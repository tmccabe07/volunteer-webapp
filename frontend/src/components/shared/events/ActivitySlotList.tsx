'use client';

import { Badge } from '@/components/ui/badge';
import { Users, Trophy } from 'lucide-react';
import SignupButton from '@/components/forms/events/SignupButton';
import WithdrawButton from '@/components/forms/events/WithdrawButton';

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

interface ActivitySlotListProps {
  activitySlots: ActivitySlot[];
  eventId: string;
  currentUserId?: string;
  isComplete: boolean;
  isPastEvent: boolean;
  onSignup?: (activitySlotId: string) => Promise<void>;
  onWithdraw?: (activitySlotId: string) => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-purple-100 text-purple-800',
  HIGH: 'bg-orange-100 text-orange-800',
  SPECIAL: 'bg-red-100 text-red-800',
};

export default function ActivitySlotList({
  activitySlots,
  eventId,
  currentUserId,
  isComplete,
  isPastEvent,
  onSignup,
  onWithdraw,
}: ActivitySlotListProps) {
  return (
    <div className="space-y-4">
      {activitySlots.map((slot) => {
        const activeSignups = slot.signups.filter(s => !s.withdrawn);
        const signedUpCount = activeSignups.length;
        const isAtCapacity = slot.capacity !== null && signedUpCount >= slot.capacity;
        const currentUserSignup = currentUserId
          ? slot.signups.find(s => s.volunteer.id === currentUserId && !s.withdrawn)
          : null;

        return (
          <div key={slot.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{slot.activityType.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={CATEGORY_COLORS[slot.activityType.category]}>
                    {slot.activityType.category}
                  </Badge>
                  <div className="flex items-center text-sm text-gray-600">
                    <Trophy className="h-4 w-4 mr-1" />
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

                {!isComplete && !isPastEvent && (
                  <>
                    {currentUserSignup ? (
                      onWithdraw && (
                        <WithdrawButton
                          activitySlotId={slot.id}
                          eventId={eventId}
                          activityName={slot.activityType.name}
                          onWithdraw={onWithdraw}
                        />
                      )
                    ) : (
                      onSignup && (
                        <SignupButton
                          activitySlotId={slot.id}
                          eventId={eventId}
                          capacity={slot.capacity}
                          signedUpCount={signedUpCount}
                          isSignedUp={false}
                          onSignup={onSignup}
                        />
                      )
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Show volunteers who signed up */}
            {activeSignups.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500 mb-2">Volunteers:</p>
                <div className="flex flex-wrap gap-2">
                  {activeSignups.map((signup) => (
                    <Badge key={signup.id} variant="secondary">
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

      {activitySlots.length === 0 && (
        <p className="text-center text-gray-500 py-8">No activities available for this event.</p>
      )}
    </div>
  );
}
