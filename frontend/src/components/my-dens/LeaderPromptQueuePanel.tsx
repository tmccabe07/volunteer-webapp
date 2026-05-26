'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  hoursPromptService,
  type ParentPromptItem,
  type PromptStatus,
} from '@/services/hoursPromptService';

interface LeaderPromptQueuePanelProps {
  denId: string;
}

export default function LeaderPromptQueuePanel({ denId }: LeaderPromptQueuePanelProps) {
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACKNOWLEDGED'>('PENDING');
  const [prompts, setPrompts] = useState<ParentPromptItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await hoursPromptService.getPrompts({
        denId,
        category: 'REQUIREMENT',
        status: statusFilter,
      });
      setPrompts(response.data);
      setSelectedIds((prev) => prev.filter((id) => response.data.some((item) => item.id === id)));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load prompt queue');
    } finally {
      setIsLoading(false);
    }
  }, [denId, statusFilter]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const updateSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, id])]);
      return;
    }

    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const allSelected = prompts.length > 0 && prompts.every((prompt) => selectedIds.includes(prompt.id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...prompts.map((item) => item.id)])]);
      return;
    }

    const visibleIds = new Set(prompts.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const runBulkAction = async (mode: 'acknowledge' | 'dismiss') => {
    try {
      setIsSubmitting(true);
      setError(null);

      await Promise.allSettled(
        selectedIds.map((id) =>
          mode === 'acknowledge'
            ? hoursPromptService.acknowledgePrompt(id)
            : hoursPromptService.dismissPrompt(id),
        ),
      );

      await loadPrompts();
      setSelectedIds([]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update selected prompts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runSingleAction = async (promptId: string, mode: 'acknowledge' | 'dismiss') => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === 'acknowledge') {
        await hoursPromptService.acknowledgePrompt(promptId);
      } else {
        await hoursPromptService.dismissPrompt(promptId);
      }

      await loadPrompts();
      setSelectedIds((prev) => prev.filter((id) => id !== promptId));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadgeClass = useMemo<Record<PromptStatus, string>>(
    () => ({
      PENDING: 'bg-amber-100 text-amber-900',
      SENT: 'bg-sky-100 text-sky-900',
      ACKNOWLEDGED: 'bg-emerald-100 text-emerald-900',
      DISMISSED: 'bg-slate-100 text-slate-900',
    }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Leader Prompt Queue</h3>
          <p className="text-sm text-gray-600">Requirement prompts scoped to the active den.</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('PENDING')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'ACKNOWLEDGED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ACKNOWLEDGED')}
          >
            Acknowledged
          </Button>
        </div>
      </div>

      {statusFilter === 'PENDING' && (
        <div className="flex items-center justify-between gap-2 flex-wrap rounded border bg-slate-50 p-3">
          <p className="text-sm text-slate-700">Selected: {selectedIds.length}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIds.length === 0 || isSubmitting}
              onClick={() => runBulkAction('dismiss')}
            >
              Dismiss Selected
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || isSubmitting}
              onClick={() => runBulkAction('acknowledge')}
            >
              Mark Selected Entered
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading prompt queue...</p>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : prompts.length === 0 ? (
        <p className="text-sm text-gray-600">No prompts in this status for the active den.</p>
      ) : (
        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                {statusFilter === 'PENDING' && (
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                      aria-label="Select all prompts"
                    />
                  </TableHead>
                )}
                <TableHead>Cub Scout</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  {statusFilter === 'PENDING' && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(prompt.id)}
                        onChange={(event) => updateSelection(prompt.id, event.target.checked)}
                        aria-label={`Select ${prompt.childScout.name} prompt`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{prompt.childScout.name}</div>
                    <div className="text-xs text-slate-600">{prompt.category}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{prompt.event.title}</div>
                    <div className="text-xs text-slate-600">{new Date(prompt.event.eventDate).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm text-slate-700 truncate">{prompt.message}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass[prompt.status]}>{prompt.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {statusFilter === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => runSingleAction(prompt.id, 'dismiss')}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => runSingleAction(prompt.id, 'acknowledge')}
                        >
                          Mark Entered
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
