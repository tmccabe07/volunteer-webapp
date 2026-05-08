'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserCheck, Check } from 'lucide-react';

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
  const [showSuccess, setShowSuccess] = useState(false);

  const isAtCapacity = capacity !== null && signedUpCount >= capacity;

  const handleSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      await onSignup(activitySlotId);
      
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <Button disabled variant="secondary" size="sm" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20">
        <Check className="h-4 w-4 mr-2 motion-safe:animate-scale-in" />
        Success!
      </Button>
    );
  }

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
