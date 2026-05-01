'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserCheck } from 'lucide-react';

interface SignupButtonProps {
  activitySlotId: string;
  eventId: string;
  capacity: number | null;
  signedUpCount: number;
  isSignedUp: boolean;
  onSignup: (activitySlotId: string) => Promise<void>;
}

export default function SignupButton({
  activitySlotId,
  eventId,
  capacity,
  signedUpCount,
  isSignedUp,
  onSignup,
}: SignupButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAtCapacity = capacity !== null && signedUpCount >= capacity;

  const handleSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      await onSignup(activitySlotId);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (isSignedUp) {
    return (
      <Button disabled variant="secondary" size="sm">
        <UserCheck className="h-4 w-4 mr-2" />
        Signed Up
      </Button>
    );
  }

  if (isAtCapacity) {
    return (
      <Button disabled variant="outline" size="sm">
        Full ({signedUpCount}/{capacity})
      </Button>
    );
  }

  return (
    <div>
      <Button onClick={handleSignup} disabled={loading} variant="outline" size="sm">
        {loading ? 'Signing up...' : 'Sign Up'}
        {capacity && ` (${signedUpCount}/${capacity})`}
      </Button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
