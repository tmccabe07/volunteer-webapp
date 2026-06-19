'use client';

import { useEffect, useState } from 'react';
import { awardService } from '@/services/awardService';
import { advancementService } from '@/services/advancement.service';
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
  denId?: string | null;
  dens?: Array<{ id: string; name: string; denNumber: number }>;
}

const RANK_OPTIONS = ['ALL', 'LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'] as const;
const CUSTOM_ADVENTURE_VALUE = 'CUSTOM';

interface AdventureOption {
  id: string;
  name: string;
  rankLevel?: string;
}

export default function CreateInventoryItemDialog({ open, onClose, onCreated, denId, dens }: CreateInventoryItemDialogProps) {
    const [selectedDenId, setSelectedDenId] = useState<string>(denId ?? '');
    useEffect(() => {
      setSelectedDenId(denId ?? '');
    }, [denId]);
  const [itemName, setItemName] = useState('');
  const [rankLevel, setRankLevel] = useState<(typeof RANK_OPTIONS)[number]>('ALL');
  const [adventures, setAdventures] = useState<AdventureOption[]>([]);
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>(CUSTOM_ADVENTURE_VALUE);
  const [isAdventureLoading, setIsAdventureLoading] = useState(false);
  const [onHandQuantity, setOnHandQuantity] = useState('0');
  const [reorderPoint, setReorderPoint] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rankOptionSet = new Set<string>(RANK_OPTIONS);

  useEffect(() => {
    if (!open) {
      return;
    }

    setItemName('');
    setRankLevel('ALL');
    setSelectedAdventureId(CUSTOM_ADVENTURE_VALUE);
    setOnHandQuantity('0');
    setReorderPoint('');
    setUnitCost('');
    setError(null);

    const loadAdventures = async () => {
      try {
        setIsAdventureLoading(true);
        const response = await advancementService.getAdventures();
        const options: AdventureOption[] = (response.data || [])
          .map((adventure) => ({
            id: adventure.id,
            name: adventure.name,
            rankLevel: (adventure as AdventureOption).rankLevel,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setAdventures(options);

        if (options.length > 0) {
          const firstAdventure = options[0];
          setSelectedAdventureId(firstAdventure.id);
          setItemName(firstAdventure.name);
          if (firstAdventure.rankLevel && rankOptionSet.has(firstAdventure.rankLevel)) {
            setRankLevel(firstAdventure.rankLevel as (typeof RANK_OPTIONS)[number]);
          }
        }
      } catch {
        setAdventures([]);
        setSelectedAdventureId(CUSTOM_ADVENTURE_VALUE);
      } finally {
        setIsAdventureLoading(false);
      }
    };

    void loadAdventures();
  }, [open]);

  const handleAdventureChange = (value: string) => {
    setSelectedAdventureId(value);

    if (value === CUSTOM_ADVENTURE_VALUE) {
      return;
    }

    const selectedAdventure = adventures.find((adventure) => adventure.id === value);
    if (!selectedAdventure) {
      return;
    }

    setItemName(selectedAdventure.name);
    if (selectedAdventure.rankLevel && rankOptionSet.has(selectedAdventure.rankLevel)) {
      setRankLevel(selectedAdventure.rankLevel as (typeof RANK_OPTIONS)[number]);
    }
  };

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
        denId: selectedDenId || null,
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
        {Array.isArray(dens) && (
          <div className="space-y-2">
            <Label htmlFor="den-select">Den Scope</Label>
            <Select
              value={selectedDenId || 'ALL'}
              onValueChange={val => setSelectedDenId(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger id="den-select" className="min-w-[180px]">
                <SelectValue placeholder="All Dens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Dens</SelectItem>
                {dens.map((den) => (
                  <SelectItem key={den.id} value={den.id}>
                    {den.name} (#{den.denNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Choose a den to scope this inventory item, or leave as pack-wide.</p>
          </div>
        )}

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Inventory Item</DialogTitle>
          <DialogDescription>Add a new badge or award item to inventory tracking.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Adventure Catalog (optional)</Label>
          <Select
            value={selectedAdventureId}
            onValueChange={handleAdventureChange}
            disabled={isAdventureLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isAdventureLoading ? 'Loading adventures...' : 'Select an adventure'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CUSTOM_ADVENTURE_VALUE}>Custom / Special Award (free text)</SelectItem>
              {adventures.map((adventure) => (
                <SelectItem key={adventure.id} value={adventure.id}>
                  {adventure.name}
                  {adventure.rankLevel ? ` (${adventure.rankLevel})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Adventure selection pre-fills item name and rank. Choose custom for special awards.
          </p>
        </div>

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
