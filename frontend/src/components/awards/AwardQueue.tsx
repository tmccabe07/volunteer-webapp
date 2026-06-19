'use client';

import { useMemo, useState } from 'react';
import { AwardState, type AwardItem } from '@/services/awardService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AwardItemCard from './AwardItemCard';

interface AwardQueueProps {
  items: AwardItem[];
  isLoading: boolean;
  error: string | null;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onRefresh: () => void;
  onTransitionClick: (item: AwardItem) => void;
  hideStateFilter?: boolean;
}

const NEXT_ACTION_BY_STATE: Record<string, { cta: string }> = {
  ELIGIBLE: { cta: 'Approve for Purchase' },
  APPROVED: { cta: 'Record as Purchased' },
  PURCHASED: { cta: 'Mark as Distributed' },
  DISTRIBUTED: { cta: 'Confirm Scoutbook Awarded' },
  RECONCILED: { cta: 'Update Status' },
};

const STATE_COLORS: Record<string, string> = {
  ELIGIBLE: 'bg-sky-100 text-sky-800 border-sky-200',
  APPROVED: 'bg-amber-100 text-amber-800 border-amber-200',
  PURCHASED: 'bg-violet-100 text-violet-800 border-violet-200',
  DISTRIBUTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECONCILED: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function AwardQueue({
  items,
  isLoading,
  error,
  selectedIds,
  onSelectedIdsChange,
  onRefresh,
  onTransitionClick,
  hideStateFilter = false,
}: AwardQueueProps) {
  const [stateFilter, setStateFilter] = useState<'ALL' | AwardState>('ALL');

  const filteredItems = useMemo(() => {
    if (hideStateFilter) {
      return items;
    }

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

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...new Set([...selectedIds, ...filteredItems.map((item) => item.id)])]);
      return;
    }

    const filteredIds = new Set(filteredItems.map((item) => item.id));
    onSelectedIdsChange(selectedIds.filter((id) => !filteredIds.has(id)));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {!hideStateFilter && (
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
          )}
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
        <>
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                      aria-label="Select all visible awards"
                    />
                  </TableHead>
                  <TableHead>Award</TableHead>
                  <TableHead>Cub Scout</TableHead>
                  <TableHead>Den</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const actionMeta = NEXT_ACTION_BY_STATE[item.currentState] || NEXT_ACTION_BY_STATE.RECONCILED;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(event) => updateSelection(item.id, event.target.checked)}
                          aria-label={`Select ${item.award.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.award.name}</div>
                        <div className="text-xs text-slate-600">{item.award.type}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.childScout.name}</div>
                        <div className="text-xs text-slate-600">{item.childScout.currentRank}</div>
                      </TableCell>
                      <TableCell>{item.den?.name ?? 'Pack-wide'}</TableCell>
                      <TableCell>{item.quantityNeeded}</TableCell>
                      <TableCell>
                        <Badge className={STATE_COLORS[item.currentState] ?? ''}>{item.currentState}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => onTransitionClick(item)}>
                          {actionMeta.cta}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
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
        </>
      )}
    </section>
  );
}
