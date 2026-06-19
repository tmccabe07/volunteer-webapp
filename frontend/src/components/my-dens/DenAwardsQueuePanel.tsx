'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { awardService, type AwardItem, type AwardQueueType } from '@/services/awardService';
import AwardQueue from '@/components/awards/AwardQueue';
import TransitionAwardDialog from '@/components/awards/TransitionAwardDialog';
import BatchTransitionDialog from '@/components/awards/BatchTransitionDialog';

interface DenAwardsQueuePanelProps {
  denId: string;
  queueType: AwardQueueType;
}

export default function DenAwardsQueuePanel({ denId, queueType }: DenAwardsQueuePanelProps) {
  const [items, setItems] = useState<AwardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<AwardItem | null>(null);
  const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [purchaseSummary, setPurchaseSummary] = useState<
    Array<{
      denId: string | null;
      denName: string;
      awardName: string;
      rankLevel: string;
      quantity: number;
      onHandQuantity: number;
      netToPurchase: number;
    }>
  >([]);

  const loadQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await awardService.getAwards({ denId, queueType });
      setItems(response.data);
      setPurchaseSummary(response.purchaseSummary || []);
      setSelectedIds((prev) => prev.filter((id) => response.data.some((item) => item.id === id)));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load award queue');
    } finally {
      setIsLoading(false);
    }
  }, [denId, queueType]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const title = useMemo(() => {
    if (queueType === 'TO_PURCHASE') {
      return 'To Purchase Queue';
    }

    if (queueType === 'TO_AWARD') {
      return 'To Award Queue';
    }

    return 'Scoutbook Reminder Queue';
  }, [queueType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-600">Active den scoped. Use row actions for single updates or bulk for selected rows.</p>
        </div>
        <Button onClick={() => setIsBatchDialogOpen(true)} disabled={selectedIds.length === 0}>
          Bulk Update Selected ({selectedIds.length})
        </Button>
      </div>

      {queueType === 'TO_PURCHASE' && purchaseSummary.length > 0 && (
        <section className="space-y-2 rounded-md border p-4">
          <h4 className="text-base font-semibold">Purchase Summary</h4>
          <p className="text-sm text-slate-600">
            Aggregated quantities by award with current inventory applied.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {purchaseSummary.map((item, index) => (
              <div key={`${item.denId || 'PACK'}-${item.awardName}-${index}`} className="rounded border p-3">
                <p className="text-sm font-medium">{item.awardName}</p>
                <p className="text-xs text-slate-600">{item.denName} • {item.rankLevel}</p>
                <p className="text-xs mt-1 text-slate-700">Queue quantity: <strong>{item.quantity}</strong></p>
                <p className="text-xs text-slate-700">On hand inventory: <strong>{item.onHandQuantity}</strong></p>
                <p className="text-sm mt-1">Net to purchase: <strong>{item.netToPurchase}</strong></p>
              </div>
            ))}
          </div>
        </section>
      )}

      <AwardQueue
        items={items}
        isLoading={isLoading}
        error={error}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRefresh={loadQueue}
        hideStateFilter
        onTransitionClick={(item) => {
          setSelectedItem(item);
          setIsSingleDialogOpen(true);
        }}
      />

      <TransitionAwardDialog
        open={isSingleDialogOpen}
        item={selectedItem}
        onClose={() => {
          setIsSingleDialogOpen(false);
          setSelectedItem(null);
        }}
        onCompleted={loadQueue}
      />

      <BatchTransitionDialog
        open={isBatchDialogOpen}
        awardIds={selectedIds}
        onClose={() => setIsBatchDialogOpen(false)}
        onCompleted={async () => {
          await loadQueue();
          setSelectedIds([]);
        }}
      />
    </div>
  );
}
