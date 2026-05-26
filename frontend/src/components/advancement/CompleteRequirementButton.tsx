'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';
import { advancementService } from '@/services/advancement.service';

interface CompleteRequirementButtonProps {
  childScoutId: string;
  requirementId: string;
  isCompleted: boolean;
  canComplete: boolean;
  onCompleted: () => Promise<void> | void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const maybeResponse = (error as { response?: { data?: { error?: string } } }).response;
    if (maybeResponse?.data?.error) {
      return maybeResponse.data.error;
    }
  }
  return fallback;
}

export default function CompleteRequirementButton({
  childScoutId,
  requirementId,
  isCompleted,
  canComplete,
  onCompleted,
}: CompleteRequirementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      await advancementService.completeRequirement(requirementId, {
        childScoutId,
        completionType: 'PARENT_SUBMIT',
        notes: notes.trim() || undefined,
      });

      await onCompleted();
      setNotes('');
      setIsOpen(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to complete requirement'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <Button variant="outline" size="sm" disabled>
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Completed
      </Button>
    );
  }

  if (!canComplete) {
    return null;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Mark Complete
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Mark Requirement Complete</DialogTitle>
            <DialogDescription className="text-slate-700">
              Confirm this requirement is complete for the selected Cub Scout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-slate-800">
            <Label htmlFor="requirementNotes">Notes (Optional)</Label>
            <Input
              id="requirementNotes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setError(null);
              }}
              placeholder="Add context for leaders reviewing reconciliation"
              maxLength={300}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Confirm Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
