'use client';

import { useEffect, useMemo, useState } from 'react';
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

const NEXT_STATE_BY_CURRENT: Partial<Record<AwardState, AwardState>> = {
  ELIGIBLE: 'APPROVED',
  APPROVED: 'PURCHASED',
  PURCHASED: 'DISTRIBUTED',
  DISTRIBUTED: 'RECONCILED',
};

const NEXT_REASON_BY_CURRENT: Partial<Record<AwardState, string>> = {
  ELIGIBLE: 'Ready to enter purchase workflow.',
  APPROVED: 'Record whether this is newly purchased or covered by current inventory.',
  PURCHASED: 'Mark after physically awarding to the Cub Scout.',
  DISTRIBUTED: 'Confirm Scoutbook is updated to awarded to close the loop.',
};

export default function TransitionAwardDialog({ open, item, onClose, onCompleted }: TransitionAwardDialogProps) {
  const [toState, setToState] = useState<AwardState>('APPROVED');
  const [procurementSource, setProcurementSource] = useState<'PURCHASE' | 'ON_HAND'>('PURCHASE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableStates = useMemo(() => {
    if (!item) {
      return ['APPROVED'] as AwardState[];
    }

    const next = NEXT_STATE_BY_CURRENT[item.currentState];
    if (next) {
      return [next];
    }

    return [item.currentState];
  }, [item]);

  useEffect(() => {
    if (open) {
      setError(null);
      setNotes('');
      setProcurementSource('PURCHASE');
      const defaultState = item ? NEXT_STATE_BY_CURRENT[item.currentState] || 'RECONCILED' : 'APPROVED';
      setToState(defaultState as AwardState);
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
        procurementSource,
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
          <DialogTitle>Update Award Status</DialogTitle>
          <DialogDescription>
            Move this award to the appropriate next status.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-medium">Award:</span> {item.award.name}</p>
            <p><span className="font-medium">Cub Scout:</span> {item.childScout.name}</p>
            <p><span className="font-medium">Current State:</span> {item.currentState}</p>
            {NEXT_STATE_BY_CURRENT[item.currentState] && (
              <div className="rounded border bg-slate-50 p-2 text-xs text-slate-700">
                <p><span className="font-medium">Recommended Next Status:</span> {NEXT_STATE_BY_CURRENT[item.currentState]}</p>
                <p>{NEXT_REASON_BY_CURRENT[item.currentState]}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>New Status</Label>
          <Select value={toState} onValueChange={(value) => setToState(value as AwardState)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose next status" />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {toState === 'PURCHASED' && (
          <div className="space-y-2">
            <Label>How is this being sourced?</Label>
            <Select value={procurementSource} onValueChange={(value) => setProcurementSource(value as 'PURCHASE' | 'ON_HAND')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PURCHASE">Purchase new inventory</SelectItem>
                <SelectItem value="ON_HAND">Use existing on-hand inventory</SelectItem>
              </SelectContent>
            </Select>
            {procurementSource === 'ON_HAND' && (
              <p className="text-xs text-slate-600">
                This will not increase inventory. It marks the award as sourced from current stock.
              </p>
            )}
          </div>
        )}

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
          <Button onClick={handleSubmit} disabled={isSubmitting || !item}>{isSubmitting ? 'Saving...' : 'Update Status'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
