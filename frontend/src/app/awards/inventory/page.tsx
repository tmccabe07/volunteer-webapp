'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { awardService, type InventoryItem, type InventoryResponse } from '@/services/awardService';
import InventoryList from '@/components/awards/InventoryList';
import AdjustInventoryDialog from '@/components/awards/AdjustInventoryDialog';
import ReorderAlerts from '@/components/awards/ReorderAlerts';
import CreateInventoryItemDialog from '@/components/awards/CreateInventoryItemDialog';
import { Button } from '@/components/ui/button';

export default function InventoryPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryResponse['reorderAlerts']>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      setIsInventoryLoading(true);
      setInventoryError(null);
      const response = await awardService.getInventory();
      setItems(response.data);
      setAlerts(response.reorderAlerts);
    } catch (err: any) {
      setInventoryError(err?.response?.data?.error || 'Failed to load inventory');
    } finally {
      setIsInventoryLoading(false);
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
      loadInventory();
    }
  }, [isLoading, user, loadInventory]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Award Inventory</h1>
        <p className="text-slate-600 mt-2">Monitor stock levels and post manual adjustments with reason tracking.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>Add Inventory Item</Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reorder Alerts</h2>
        <ReorderAlerts alerts={alerts} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Inventory</h2>
        {isInventoryLoading ? (
          <p className="text-sm text-slate-600">Loading inventory...</p>
        ) : inventoryError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{inventoryError}</div>
        ) : (
          <InventoryList
            items={items}
            onAdjust={(item) => {
              setSelectedItem(item);
              setIsAdjustOpen(true);
            }}
          />
        )}
      </section>

      <AdjustInventoryDialog
        open={isAdjustOpen}
        item={selectedItem}
        onClose={() => {
          setIsAdjustOpen(false);
          setSelectedItem(null);
        }}
        onAdjusted={loadInventory}
      />

      <CreateInventoryItemDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadInventory}
      />
    </div>
  );
}
