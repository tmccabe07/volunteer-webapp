'use client';

import { useEffect, useState } from 'react';
import { awardService, type InventoryItem } from '@/services/awardService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface AdjustInventoryDialogProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onAdjusted: () => Promise<void> | void;
}

export default function AdjustInventoryDialog({ open, item, onClose, onAdjusted }: AdjustInventoryDialogProps) {
  const [quantityChange, setQuantityChange] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantityChange('');
      setReason('');
      setNotes('');
      setError(null);
    }
  }, [open, item?.id]);

  const handleSubmit = async () => {
    if (!item) {
      return;
    }

    const parsedQuantity = Number(quantityChange);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
      setError('Quantity change must be a non-zero integer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await awardService.adjustInventory({
        inventoryItemId: item.id,
        quantityChange: parsedQuantity,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      await onAdjusted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to adjust inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Inventory</DialogTitle>
          <DialogDescription>
            {item ? `Update stock for ${item.itemName}` : 'Update stock levels'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="quantityChange">Quantity Change</Label>
          <Input
            id="quantityChange"
            value={quantityChange}
            onChange={(event) => setQuantityChange(event.target.value)}
            placeholder="e.g. -2 or 5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustReason">Reason</Label>
          <Input id="adjustReason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustNotes">Notes (optional)</Label>
          <Textarea id="adjustNotes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !item}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
