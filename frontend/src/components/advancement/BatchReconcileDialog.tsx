'use client';

import { useEffect, useState } from 'react';
import { advancementService } from '@/services/advancement.service';
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

interface BatchReconcileDialogProps {
  open: boolean;
  items: Array<{
    id: string;
    version: number;
  }>;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  return fallback;
}

export default function BatchReconcileDialog({
  open,
  items,
  onClose,
  onCompleted,
}: BatchReconcileDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const results = await Promise.allSettled(
        items.map((item) =>
          advancementService.reconcileRequirement(item.id, {
            version: item.version,
            notes: notes.trim() || undefined,
          }),
        ),
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      await onCompleted();

      if (failureCount > 0) {
        setError(
          `Updated ${successCount} of ${results.length} selected items. ${failureCount} could not be updated (likely already changed by someone else).`,
        );
        return;
      }

      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update selected items'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Bulk Mark as Entered</DialogTitle>
          <DialogDescription className="text-slate-700">
            Confirm Scoutbook entry for {items.length} selected requirement completion
            {items.length === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-slate-800">
          <Label htmlFor="batchScoutbookNotes">Scoutbook Notes (Optional)</Label>
          <Textarea
            id="batchScoutbookNotes"
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError(null);
            }}
            placeholder="Optional audit note applied to all selected records"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? 'Saving...' : 'Mark Selected as Entered'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
