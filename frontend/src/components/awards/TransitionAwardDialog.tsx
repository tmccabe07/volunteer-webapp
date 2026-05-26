'use client';

import { useEffect, useState } from 'react';
import { AwardState, awardService, type AwardItem } from '@/services/awardService';
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

interface TransitionAwardDialogProps {
  open: boolean;
  item: AwardItem | null;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

const AVAILABLE_STATES: AwardState[] = ['ELIGIBLE', 'APPROVED', 'PURCHASED', 'DISTRIBUTED', 'RECONCILED'];

export default function TransitionAwardDialog({ open, item, onClose, onCompleted }: TransitionAwardDialogProps) {
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
  }, [open, item?.id]);

  const handleSubmit = async () => {
    if (!item) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await awardService.transitionAward(item.id, {
        toState,
        notes: notes.trim() || undefined,
      });
      await onCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to transition award');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transition Award</DialogTitle>
          <DialogDescription>
            Move this item to the next lifecycle state.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-medium">Award:</span> {item.award.name}</p>
            <p><span className="font-medium">Cub Scout:</span> {item.childScout.name}</p>
            <p><span className="font-medium">Current State:</span> {item.currentState}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>New State</Label>
          <Select value={toState} onValueChange={(value) => setToState(value as AwardState)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose next state" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {toState === 'PURCHASED' && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Reimbursement reminder: include a purchase receipt and submit the reimbursement form.
            <div className="mt-1">
              <a href="/docs/reimbursement" className="underline">Open reimbursement form instructions</a>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="transitionNotes">Notes (optional)</Label>
          <Textarea
            id="transitionNotes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !item}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
