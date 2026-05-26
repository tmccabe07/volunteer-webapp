'use client';

import { useEffect, useState } from 'react';
import { AwardState, awardService } from '@/services/awardService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BatchTransitionDialogProps {
  open: boolean;
  awardIds: string[];
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

const AVAILABLE_STATES: AwardState[] = ['APPROVED', 'PURCHASED', 'DISTRIBUTED', 'RECONCILED', 'ELIGIBLE'];

export default function BatchTransitionDialog({ open, awardIds, onClose, onCompleted }: BatchTransitionDialogProps) {
  const [toState, setToState] = useState<AwardState>('APPROVED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setNotes('');
      setToState('APPROVED');
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await awardService.batchTransition({
        awardIds,
        toState,
        notes: notes.trim() || undefined,
      });
      await onCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to run batch transition');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch Transition Awards</DialogTitle>
          <DialogDescription>
            Update {awardIds.length} selected awards at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>New State</Label>
          <Select value={toState} onValueChange={(value) => setToState(value as AwardState)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchNotes">Notes (optional)</Label>
          <Textarea
            id="batchNotes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || awardIds.length === 0}>
            {isSubmitting ? 'Updating...' : 'Run Batch Transition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
