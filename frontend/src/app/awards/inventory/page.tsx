'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { awardService, type InventoryItem, type InventoryResponse } from '@/services/awardService';
import { denService, DenListItem } from '@/services/den.service';
import { volunteerApi, type VolunteerProfile } from '@/services/volunteer.service';
import InventoryList from '@/components/awards/InventoryList';
import AdjustInventoryDialog from '@/components/awards/AdjustInventoryDialog';
import ReorderAlerts from '@/components/awards/ReorderAlerts';
import CreateInventoryItemDialog from '@/components/awards/CreateInventoryItemDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryResponse['reorderAlerts']>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dens, setDens] = useState<DenListItem[]>([]);
  const requestedDenId = useMemo(() => searchParams.get('denId') || '', [searchParams]);
  const [selectedDenId, setSelectedDenId] = useState<string>(requestedDenId);

  const loadInventory = useCallback(async (denId?: string) => {
    try {
      setIsInventoryLoading(true);
      setInventoryError(null);
      const response = await awardService.getInventory(denId ? { denId } : undefined);
      setItems(response.data);
      setAlerts(response.reorderAlerts);
    } catch (err: unknown) {
      const errorMessage = (
        err as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      setInventoryError(errorMessage || 'Failed to load inventory');
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

  // Load dens for den selector
  useEffect(() => {
    if (!user || user.authTier === 'PARENT') return;

    const mapProfileRolesToDens = (roles: VolunteerProfile['roles'] | undefined): DenListItem[] => {
      const uniqueRoleDens = new Map<string, DenListItem>();
      (roles || []).forEach((role) => {
        if (role.denId && role.denName && role.denNumber && role.denRankLevel) {
          uniqueRoleDens.set(role.denId, {
            id: role.denId,
            name: role.denName,
            denNumber: role.denNumber,
            rankLevel: role.denRankLevel,
            isActive: true,
            currentMemberCount: 0,
            leaders: [],
          });
        }
      });

      return Array.from(uniqueRoleDens.values()).sort((a, b) => a.denNumber - b.denNumber);
    };

    const fetchDens = async () => {
      try {
        let denOptions: DenListItem[] = [];

        try {
          const res = await denService.listDens({ isActive: true });
          denOptions = res.data;
        } catch {
          // Fallback keeps selector functional if list endpoint is scoped by role.
          const myProfile = await volunteerApi.getMyProfile();
          denOptions = mapProfileRolesToDens(myProfile.roles);
        }

        setDens(denOptions);

        if (requestedDenId && denOptions.some((den) => den.id === requestedDenId)) {
          setSelectedDenId(requestedDenId);
        } else {
          setSelectedDenId('');
        }
      } catch {
        setDens([]);
        setSelectedDenId('');
      }
    };

    fetchDens();
  }, [user, requestedDenId]);

  useEffect(() => {
    if (!isLoading && user && user.authTier !== 'PARENT') {
      loadInventory(selectedDenId || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, selectedDenId]);

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="den-select" className="font-medium">Den Scope:</label>
          <Select
            value={selectedDenId || 'ALL'}
            onValueChange={val => setSelectedDenId(val === 'ALL' ? '' : val)}
          >
            <SelectTrigger className="min-w-[180px]">
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
        </div>
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
        onAdjusted={() => loadInventory(selectedDenId || undefined)}
      />

      <CreateInventoryItemDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => loadInventory(selectedDenId || undefined)}
        denId={selectedDenId || null}
        dens={dens}
      />
    </div>
  );
}
