'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ParentPromptItem } from '@/services/hoursPromptService';

interface AcknowledgePromptDialogProps {
  open: boolean;
  prompt: ParentPromptItem | null;
  mode: 'acknowledge' | 'dismiss';
  onClose: () => void;
  onConfirm: (promptId: string, notes?: string) => Promise<void>;
}

export default function AcknowledgePromptDialog({
  open,
  prompt,
  mode,
  onClose,
  onConfirm,
}: AcknowledgePromptDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!prompt) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(prompt.id, notes.trim() || undefined);
      setNotes('');
      onClose();
    } catch {
      setError('Unable to update prompt status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>
            {mode === 'acknowledge' ? 'Mark Prompt Entered' : 'Dismiss Prompt'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'acknowledge'
              ? 'Confirm that this suggestion was entered in Scoutbook.'
              : 'Dismiss this prompt from your active queue.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="promptNotes">Notes (optional)</Label>
          <Textarea
            id="promptNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="p-2 text-sm rounded border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !prompt}>
            {isSubmitting ? 'Saving...' : mode === 'acknowledge' ? 'Confirm' : 'Dismiss'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
