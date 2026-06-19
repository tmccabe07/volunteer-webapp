'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type AwardItem } from '@/services/awardService';

interface AwardItemCardProps {
  item: AwardItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onTransitionClick: () => void;
}

const STATE_COLORS: Record<string, string> = {
  ELIGIBLE: 'bg-sky-100 text-sky-800 border-sky-200',
  APPROVED: 'bg-amber-100 text-amber-800 border-amber-200',
  PURCHASED: 'bg-violet-100 text-violet-800 border-violet-200',
  DISTRIBUTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECONCILED: 'bg-slate-100 text-slate-800 border-slate-200',
};

const NEXT_ACTION_BY_STATE: Record<string, { next: string; reason: string; cta: string }> = {
  ELIGIBLE: {
    next: 'APPROVED',
    reason: 'Ready to move into purchasing workflow.',
    cta: 'Approve for Purchase',
  },
  APPROVED: {
    next: 'PURCHASED',
    reason: 'Record how this award is sourced before distribution.',
    cta: 'Record as Purchased',
  },
  PURCHASED: {
    next: 'DISTRIBUTED',
    reason: 'Mark once the physical award is handed to the Cub Scout.',
    cta: 'Mark as Distributed',
  },
  DISTRIBUTED: {
    next: 'RECONCILED',
    reason: 'Confirm Scoutbook is updated to awarded.',
    cta: 'Confirm Scoutbook Awarded',
  },
  RECONCILED: {
    next: 'COMPLETE',
    reason: 'No further action needed unless reopening is required.',
    cta: 'Update Status',
  },
};

export default function AwardItemCard({ item, isSelected, onSelect, onTransitionClick }: AwardItemCardProps) {
  const actionMeta = NEXT_ACTION_BY_STATE[item.currentState] || NEXT_ACTION_BY_STATE.RECONCILED;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{item.award.name}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">{item.childScout.name} • {item.childScout.currentRank}</p>
          </div>
          <Badge className={STATE_COLORS[item.currentState] ?? ''}>{item.currentState}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Type: {item.award.type} • Qty: {item.quantityNeeded}</p>
        <div className="rounded border bg-slate-50 p-2 text-xs text-slate-700">
          <p><span className="font-medium">Next:</span> {actionMeta.next}</p>
          <p>{actionMeta.reason}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-slate-600 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(event) => onSelect(event.target.checked)}
              aria-label={`Select ${item.award.name}`}
            />
            Select for bulk update
          </label>
          <Button size="sm" onClick={onTransitionClick}>{actionMeta.cta}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
