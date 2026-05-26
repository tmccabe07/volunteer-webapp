'use client';

import { useState } from 'react';
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
import { Trash2 } from 'lucide-react';
import type { PendingLinkItem } from '@/services/parentLinkService';

interface LinkApprovalDialogProps {
  open: boolean;
  link: PendingLinkItem | null;
  onClose: () => void;
  onApprove: (linkId: string) => Promise<void>;
  onReject: (linkId: string, reason: string) => Promise<void>;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const maybeResponse = (error as {
      response?: {
        data?: { error?: string };
      };
    }).response;

    if (maybeResponse?.data?.error) {
      return maybeResponse.data.error;
    }
  }

  return fallback;
}

export default function LinkApprovalDialog({
  open,
  link,
  onClose,
  onApprove,
  onReject,
}: LinkApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!link) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onApprove(link.id);
      setRejectionReason('');
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to approve link'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!link) {
      return;
    }

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onReject(link.id, trimmedReason);
      setRejectionReason('');
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to reject link'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Review Link Request</DialogTitle>
          <DialogDescription className="text-slate-700">
            Approve or reject this parent-to-cub-scout link request.
          </DialogDescription>
        </DialogHeader>

        {link && (
          <div className="space-y-3 text-sm text-slate-800">
            <div>
              <span className="font-medium">Parent:</span> {link.parent.name} ({link.parent.email})
            </div>
            <div>
              <span className="font-medium">Cub Scout:</span> {link.childScout.firstName} {link.childScout.lastName}
            </div>
            <div>
              <span className="font-medium">Rank:</span> {link.childScout.currentRank}
            </div>
            <div>
              <span className="font-medium">Den:</span> {link.childScout.denName || 'Not assigned'}
            </div>
            <div>
              <span className="font-medium">Relationship:</span> {link.relationshipType || 'Not specified'}
            </div>
          </div>
        )}

        <div className="space-y-2 text-slate-800">
          <Label htmlFor="rejectionReason">Rejection Reason (required for reject)</Label>
          <Textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              setError(null);
            }}
            placeholder="Explain why this request is being rejected"
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={handleReject}
              disabled={isSubmitting || !link}
            >
              <Trash2 className="h-4 w-4" />
              {isSubmitting ? 'Processing...' : 'Reject Request'}
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting || !link}>
              {isSubmitting ? 'Processing...' : 'Approve Request'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
