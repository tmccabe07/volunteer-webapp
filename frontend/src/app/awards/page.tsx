'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { awardService, type AwardItem } from '@/services/awardService';
import AwardQueue from '@/components/awards/AwardQueue';
import TransitionAwardDialog from '@/components/awards/TransitionAwardDialog';
import BatchTransitionDialog from '@/components/awards/BatchTransitionDialog';

export default function AwardsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<AwardItem[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<AwardItem | null>(null);
  const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const loadAwards = useCallback(async () => {
    try {
      setIsQueueLoading(true);
      setQueueError(null);
      const response = await awardService.getAwards();
      setItems(response.data);
      setSelectedIds((prev) => prev.filter((id) => response.data.some((item) => item.id === id)));
    } catch (err: any) {
      setQueueError(err?.response?.data?.error || 'Failed to load awards');
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

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
            Track approved awards through purchase, distribution, and reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/awards/inventory')}>Inventory</Button>
          <Button variant="outline" onClick={() => router.push('/awards/special')}>Special Awards</Button>
          <Button onClick={() => setIsBatchDialogOpen(true)} disabled={!canBatchTransition}>
            Batch Transition ({selectedCount})
          </Button>
        </div>
      </div>

      <AwardQueue
        items={items}
        isLoading={isQueueLoading}
        error={queueError}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onRefresh={loadAwards}
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
