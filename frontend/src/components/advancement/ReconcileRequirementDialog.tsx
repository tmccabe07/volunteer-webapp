'use client';

import { useEffect, useState } from 'react';
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
import { advancementService, type ReconcileConflictState } from '@/services/advancement.service';

export interface PendingReconciliationItem {
  id: string;
  version: number;
  childScout: {
    id: string;
    name: string;
    currentRank: string;
    denName: string;
  };
  requirement: {
    id: string;
    adventureName: string;
    requirementText: string;
  };
  completedAt: string;
  completionType: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
  daysSinceCompletion: number;
}

interface ReconcileRequirementDialogProps {
  open: boolean;
  item: PendingReconciliationItem | null;
  onClose: () => void;
  onReconciled: () => Promise<void> | void;
  onRefreshRequested: () => Promise<void> | void;
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

export default function ReconcileRequirementDialog({
  open,
  item,
  onClose,
  onReconciled,
  onRefreshRequested,
}: ReconcileRequirementDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictCurrentState, setConflictCurrentState] = useState<ReconcileConflictState | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setNotes('');
      setError(null);
      setConflictCurrentState(null);
    }
  }, [open, item?.id]);

  const handleReconcile = async () => {
    if (!item) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setConflictCurrentState(null);

      await advancementService.reconcileRequirement(item.id, {
        version: item.version,
        notes: notes.trim() || undefined,
      });

      await onReconciled();
      onClose();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as {
          response?: {
            status?: number;
            data?: {
              error?: string;
              current?: ReconcileConflictState;
            };
          };
        }).response;

        if (response?.status === 409 && response.data?.current) {
          setConflictCurrentState(response.data.current);
          setError(response.data.error || 'This requirement was updated by another request.');
          return;
        }
      }

      setError(getApiErrorMessage(err, 'Failed to reconcile requirement'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshAfterConflict = async () => {
    await onRefreshRequested();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Reconcile Requirement</DialogTitle>
          <DialogDescription className="text-slate-700">
            Confirm this requirement has been entered in Scoutbook.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-2 text-sm text-slate-800">
            <div>
              <span className="font-medium">Cub Scout:</span> {item.childScout.name}
            </div>
            <div>
              <span className="font-medium">Adventure:</span> {item.requirement.adventureName}
            </div>
            <div>
              <span className="font-medium">Requirement:</span> {item.requirement.requirementText}
            </div>
            <div>
              <span className="font-medium">Current Version:</span> {item.version}
            </div>
          </div>
        )}

        <div className="space-y-2 text-slate-800">
          <Label htmlFor="scoutbookNotes">Scoutbook Notes (Optional)</Label>
          <Textarea
            id="scoutbookNotes"
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError(null);
            }}
            placeholder="Optional audit note about entry confirmation"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}

        {conflictCurrentState && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
            <p className="font-medium">Current record state:</p>
            <p>Status: {conflictCurrentState.scoutbookStatus}</p>
            <p>Version: {conflictCurrentState.version}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {conflictCurrentState ? (
            <Button variant="outline" onClick={handleRefreshAfterConflict}>
              Refresh Queue
            </Button>
          ) : (
            <Button onClick={handleReconcile} disabled={isSubmitting || !item}>
              {isSubmitting ? 'Saving...' : 'Mark as Entered'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
