'use client';

import { useEffect, useState } from 'react';
import { awardService } from '@/services/awardService';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateInventoryItemDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

const RANK_OPTIONS = ['ALL', 'LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'] as const;

export default function CreateInventoryItemDialog({ open, onClose, onCreated }: CreateInventoryItemDialogProps) {
  const [itemName, setItemName] = useState('');
  const [rankLevel, setRankLevel] = useState<(typeof RANK_OPTIONS)[number]>('ALL');
  const [onHandQuantity, setOnHandQuantity] = useState('0');
  const [reorderPoint, setReorderPoint] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setItemName('');
      setRankLevel('ALL');
      setOnHandQuantity('0');
      setReorderPoint('');
      setUnitCost('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const parsedOnHand = Number(onHandQuantity);
    const parsedReorder = reorderPoint.trim() === '' ? null : Number(reorderPoint);
    const parsedUnitCost = unitCost.trim() === '' ? null : Number(unitCost);

    if (!itemName.trim()) {
      setError('Item name is required.');
      return;
    }

    if (!Number.isInteger(parsedOnHand) || parsedOnHand < 0) {
      setError('On hand quantity must be a whole number 0 or greater.');
      return;
    }

    if (parsedReorder !== null && (!Number.isInteger(parsedReorder) || parsedReorder < 0)) {
      setError('Reorder point must be a whole number 0 or greater.');
      return;
    }

    if (parsedUnitCost !== null && (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0)) {
      setError('Unit cost must be 0 or greater.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await awardService.createInventoryItem({
        itemName: itemName.trim(),
        rankLevel: rankLevel === 'ALL' ? null : rankLevel,
        onHandQuantity: parsedOnHand,
        reorderPoint: parsedReorder,
        unitCost: parsedUnitCost,
      });
      await onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Inventory Item</DialogTitle>
          <DialogDescription>Add a new badge or award item to inventory tracking.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="itemName">Item Name</Label>
          <Input id="itemName" value={itemName} onChange={(event) => setItemName(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Rank Scope</Label>
          <Select value={rankLevel} onValueChange={(value) => setRankLevel(value as (typeof RANK_OPTIONS)[number])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANK_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'ALL' ? 'All Ranks' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="onHandQuantity">On Hand</Label>
            <Input
              id="onHandQuantity"
              value={onHandQuantity}
              onChange={(event) => setOnHandQuantity(event.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorderPoint">Reorder Point</Label>
            <Input
              id="reorderPoint"
              value={reorderPoint}
              onChange={(event) => setReorderPoint(event.target.value)}
              placeholder="optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCost">Unit Cost</Label>
            <Input
              id="unitCost"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              placeholder="optional"
            />
          </div>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
