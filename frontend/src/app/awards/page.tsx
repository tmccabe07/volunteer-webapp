'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { awardService, type AwardItem, type AwardQueueType } from '@/services/awardService';
import AwardQueue from '@/components/awards/AwardQueue';
import TransitionAwardDialog from '@/components/awards/TransitionAwardDialog';
import BatchTransitionDialog from '@/components/awards/BatchTransitionDialog';

type QueueView = 'TO_PURCHASE' | 'TO_AWARD' | 'SCOUTBOOK_FOLLOW_UP';

export default function AwardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const denIdFilter = searchParams.get('denId') || undefined;
  const queueParam = searchParams.get('queue');

  const initialQueueView = useMemo<QueueView>(() => {
    if (queueParam === 'TO_PURCHASE' || queueParam === 'TO_AWARD' || queueParam === 'SCOUTBOOK_FOLLOW_UP') {
      return queueParam;
    }

    return 'TO_PURCHASE';
  }, [queueParam]);

  const [items, setItems] = useState<AwardItem[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<AwardItem | null>(null);
  const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [queueView, setQueueView] = useState<QueueView>(initialQueueView);
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
  const [queueCounts, setQueueCounts] = useState<Record<QueueView, number>>({
    TO_PURCHASE: 0,
    TO_AWARD: 0,
    SCOUTBOOK_FOLLOW_UP: 0,
  });

  const loadAwards = useCallback(async () => {
    try {
      setIsQueueLoading(true);
      setQueueError(null);
      const response = await awardService.getAwards({
        queueType: queueView as AwardQueueType,
        denId: denIdFilter,
      });
      setItems(response.data);
      setPurchaseSummary(response.purchaseSummary || []);
      setSelectedIds((prev) => prev.filter((id) => response.data.some((item) => item.id === id)));

      const [purchaseQueue, toAwardQueue, scoutbookFollowUpQueue] = await Promise.all([
        awardService.getAwards({ queueType: 'TO_PURCHASE', denId: denIdFilter }),
        awardService.getAwards({ queueType: 'TO_AWARD', denId: denIdFilter }),
        awardService.getAwards({ queueType: 'SCOUTBOOK_FOLLOW_UP', denId: denIdFilter }),
      ]);

      setQueueCounts({
        TO_PURCHASE: purchaseQueue.data.length,
        TO_AWARD: toAwardQueue.data.length,
        SCOUTBOOK_FOLLOW_UP: scoutbookFollowUpQueue.data.length,
      });
    } catch (err: any) {
      setQueueError(err?.response?.data?.error || 'Failed to load awards');
    } finally {
      setIsQueueLoading(false);
    }
  }, [queueView, denIdFilter]);

  useEffect(() => {
    setQueueView(initialQueueView);
  }, [initialQueueView]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!isLoading && user && user.authTier === 'PARENT') {
      router.push('/unauthorized');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && user && user.authTier !== 'PARENT') {
      loadAwards();
    }
  }, [isLoading, user, loadAwards]);

  const selectedCount = selectedIds.length;
  const canBatchTransition = useMemo(() => selectedCount > 1, [selectedCount]);
  const queueTitle =
    queueView === 'TO_PURCHASE'
      ? 'To Purchase'
      : queueView === 'TO_AWARD'
      ? 'To Award'
      : 'Scoutbook Follow-up';

  if (isLoading || (!user && !isLoading)) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Award Fulfillment Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Track purchasing, distribution, and required Scoutbook award follow-up.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/awards/inventory')}>Inventory</Button>
          <Button variant="outline" onClick={() => router.push('/awards/special')}>Special Awards</Button>
          <Button onClick={() => setIsBatchDialogOpen(true)} disabled={!canBatchTransition}>
            Bulk Update Selected ({selectedCount})
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Use each card&apos;s status button for single updates. Use checkboxes only when you want to update multiple awards at once.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={queueView === 'TO_PURCHASE' ? 'default' : 'outline'}
          onClick={() => setQueueView('TO_PURCHASE')}
        >
          To Purchase ({queueCounts.TO_PURCHASE})
        </Button>
        <Button
          variant={queueView === 'TO_AWARD' ? 'default' : 'outline'}
          onClick={() => setQueueView('TO_AWARD')}
        >
          To Award ({queueCounts.TO_AWARD})
        </Button>
        <Button
          variant={queueView === 'SCOUTBOOK_FOLLOW_UP' ? 'default' : 'outline'}
          onClick={() => setQueueView('SCOUTBOOK_FOLLOW_UP')}
        >
          Scoutbook Follow-up ({queueCounts.SCOUTBOOK_FOLLOW_UP})
        </Button>
      </div>

      <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium">Current Queue: {queueTitle}</p>
        {denIdFilter && <p className="mt-1">Scoped to active den filter.</p>}
        {queueView === 'SCOUTBOOK_FOLLOW_UP' && (
          <p className="mt-1">
            These items were physically distributed and now require Scoutbook to be updated to awarded.
          </p>
        )}
      </div>

      {queueView === 'TO_PURCHASE' && purchaseSummary.length > 0 && (
        <section className="space-y-2 rounded-md border p-4">
          <h2 className="text-lg font-semibold">Purchase Summary</h2>
          <p className="text-sm text-slate-600">
            Aggregated quantities by den and award with current inventory applied.
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
        isLoading={isQueueLoading}
        error={queueError}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRefresh={loadAwards}
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
        onCompleted={loadAwards}
      />

      <BatchTransitionDialog
        open={isBatchDialogOpen}
        awardIds={selectedIds}
        onClose={() => setIsBatchDialogOpen(false)}
        onCompleted={async () => {
          await loadAwards();
          setSelectedIds([]);
        }}
      />
    </div>
  );
}
