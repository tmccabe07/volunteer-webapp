'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ListChecks, RefreshCw } from 'lucide-react';
import { denService, type DenListItem } from '@/services/den.service';
import { advancementService } from '@/services/advancement.service';
import ReconcileRequirementDialog, {
  type PendingReconciliationItem,
} from './ReconcileRequirementDialog';
import BatchReconcileDialog from './BatchReconcileDialog';

interface ReconciliationQueueProps {
  initialDenId?: string;
  lockDenFilter?: boolean;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  return fallback;
}

const COMPLETION_TYPE_LABELS: Record<'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD', string> = {
  MEETING: 'Den Meeting',
  PARENT_SUBMIT: 'Parent Submit',
  LEADER_AWARD: 'Leader Award',
};

export default function ReconciliationQueue({ initialDenId, lockDenFilter = false }: ReconciliationQueueProps) {
  const [items, setItems] = useState<PendingReconciliationItem[]>([]);
  const [dens, setDens] = useState<DenListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PendingReconciliationItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const [denFilter, setDenFilter] = useState(initialDenId || 'ALL');
  const [completionTypeFilter, setCompletionTypeFilter] = useState('ALL');
  const [olderThanDaysFilter, setOlderThanDaysFilter] = useState('ALL');

  const loadDens = useCallback(async () => {
    try {
      const response = await denService.listDens({ isActive: true });
      setDens(response.data);
    } catch {
      setDens([]);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await advancementService.getPendingReconciliation({
        denId: denFilter !== 'ALL' ? denFilter : undefined,
        completionType:
          completionTypeFilter !== 'ALL'
            ? (completionTypeFilter as 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD')
            : undefined,
        olderThanDays:
          olderThanDaysFilter !== 'ALL' ? Number(olderThanDaysFilter) : undefined,
      });

      setItems(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load reconciliation queue'));
    } finally {
      setIsLoading(false);
    }
  }, [denFilter, completionTypeFilter, olderThanDaysFilter]);

  useEffect(() => {
    loadDens();
  }, [loadDens]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (initialDenId) {
      setDenFilter(initialDenId);
    }
  }, [initialDenId]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const filteredSelectedCount = items.filter((item) => selectedIds.includes(item.id)).length;
  const allFilteredSelected = items.length > 0 && filteredSelectedCount === items.length;

  const updateSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, id])]);
      return;
    }

    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...items.map((item) => item.id)])]);
      return;
    }

    const visibleIds = new Set(items.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const selectedItems = items
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => ({ id: item.id, version: item.version }));

  const openReconcileDialog = (item: PendingReconciliationItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Scoutbook Reconciliation Queue
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {!lockDenFilter && (
              <Select value={denFilter} onValueChange={setDenFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Den" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Dens</SelectItem>
                  {dens.map((den) => (
                    <SelectItem key={den.id} value={den.id}>
                      {den.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={completionTypeFilter} onValueChange={setCompletionTypeFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Completion Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Completion Types</SelectItem>
                <SelectItem value="MEETING">Den Meeting</SelectItem>
                <SelectItem value="PARENT_SUBMIT">Parent Submit</SelectItem>
                <SelectItem value="LEADER_AWARD">Leader Award</SelectItem>
              </SelectContent>
            </Select>

            <Select value={olderThanDaysFilter} onValueChange={setOlderThanDaysFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Age</SelectItem>
                <SelectItem value="3">3+ days old</SelectItem>
                <SelectItem value="7">7+ days old</SelectItem>
                <SelectItem value="14">14+ days old</SelectItem>
                <SelectItem value="30">30+ days old</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={loadQueue}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsBatchDialogOpen(true)}
              disabled={selectedItems.length === 0}
            >
              Mark Selected Entered ({selectedItems.length})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-600">Loading reconciliation queue...</p>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600">No pending reconciliation records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    aria-label="Select all visible requirements"
                  />
                </TableHead>
                <TableHead>Cub Scout</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => updateSelection(item.id, event.target.checked)}
                      aria-label={`Select ${item.childScout.name} requirement`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.childScout.name}</div>
                    <div className="text-xs text-gray-600">
                      {item.childScout.currentRank}
                      {item.childScout.denName ? ` • ${item.childScout.denName}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.requirement.adventureName}</div>
                    <div className="text-xs text-gray-600">{item.requirement.requirementText}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{COMPLETION_TYPE_LABELS[item.completionType]}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.daysSinceCompletion} day{item.daysSinceCompletion === 1 ? '' : 's'}
                  </TableCell>
                  <TableCell>{item.version}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => openReconcileDialog(item)}>
                      Reconcile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ReconcileRequirementDialog
        open={isDialogOpen}
        item={selectedItem}
        onClose={closeDialog}
        onReconciled={loadQueue}
        onRefreshRequested={loadQueue}
      />

      <BatchReconcileDialog
        open={isBatchDialogOpen}
        items={selectedItems}
        onClose={() => setIsBatchDialogOpen(false)}
        onCompleted={async () => {
          await loadQueue();
          setSelectedIds([]);
        }}
      />
    </Card>
  );
}
