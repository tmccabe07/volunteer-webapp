'use client';

import { useMemo, useState } from 'react';
import { AwardState, type AwardItem } from '@/services/awardService';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AwardItemCard from './AwardItemCard';

interface AwardQueueProps {
  items: AwardItem[];
  isLoading: boolean;
  error: string | null;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onRefresh: () => void;
  onTransitionClick: (item: AwardItem) => void;
}

export default function AwardQueue({
  items,
  isLoading,
  error,
  selectedIds,
  onSelectedIdsChange,
  onRefresh,
  onTransitionClick,
}: AwardQueueProps) {
  const [stateFilter, setStateFilter] = useState<'ALL' | AwardState>('ALL');

  const filteredItems = useMemo(() => {
    if (stateFilter === 'ALL') {
      return items;
    }

    return items.filter((item) => item.currentState === stateFilter);
  }, [items, stateFilter]);

  const updateSelection = (awardId: string, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...new Set([...selectedIds, awardId])]);
      return;
    }

    onSelectedIdsChange(selectedIds.filter((id) => id !== awardId));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={stateFilter} onValueChange={(value) => setStateFilter(value as 'ALL' | AwardState)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              <SelectItem value="ELIGIBLE">Eligible</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PURCHASED">Purchased</SelectItem>
              <SelectItem value="DISTRIBUTED">Distributed</SelectItem>
              <SelectItem value="RECONCILED">Reconciled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-600">{filteredItems.length} items</p>
        </div>
        <Button variant="outline" onClick={onRefresh}>Refresh</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-600">Loading award queue...</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-slate-600">No award items match this filter.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredItems.map((item) => (
            <AwardItemCard
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onSelect={(checked) => updateSelection(item.id, checked)}
              onTransitionClick={() => onTransitionClick(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
