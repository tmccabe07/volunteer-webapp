'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserMinus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WithdrawButtonProps {
  activitySlotId: string;
  eventId: string;
  activityName: string;
  onWithdraw: (activitySlotId: string) => Promise<void>;
}

export default function WithdrawButton({
  activitySlotId,
  eventId,
  activityName,
  onWithdraw,
}: WithdrawButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    setLoading(true);
    setError(null);

    try {
      await onWithdraw(activitySlotId);
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <UserMinus className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw from <strong>{activityName}</strong>? 
              This action cannot be undone. You will need to contact the event organizer to sign up again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={loading}>
              {loading ? 'Withdrawing...' : 'Confirm Withdrawal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
