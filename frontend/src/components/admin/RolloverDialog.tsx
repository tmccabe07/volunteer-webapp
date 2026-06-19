'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminBulkService, type RolloverPreviewResponse } from '@/services/adminBulkService';

interface RolloverDialogProps {
  onExecuted?: (batchId: string) => void;
}

export default function RolloverDialog({ onExecuted }: RolloverDialogProps) {
  const defaultYear = useMemo(() => String(new Date().getFullYear() + 1), []);
  const [targetYear, setTargetYear] = useState(defaultYear);
  const [isDryRun, setIsDryRun] = useState(true);
  const [preview, setPreview] = useState<RolloverPreviewResponse | null>(null);
  const [result, setResult] = useState<{ batchId: string; message: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    setIsLoadingPreview(true);
    setError('');

    try {
      const response = await adminBulkService.previewRollover(targetYear);
      setPreview(response);
    } catch (previewError: any) {
      setError(previewError.response?.data?.message || 'Failed to generate rollover preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError('');

    try {
      const response = await adminBulkService.executeRollover(targetYear, isDryRun);
      setResult(response);
      onExecuted?.(response.batchId);
    } catch (executeError: any) {
      setError(executeError.response?.data?.message || 'Failed to start rollover.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="bg-white/95 shadow-md">
      <CardHeader>
        <CardTitle>Annual Rollover</CardTitle>
        <CardDescription>Preview and execute the pack year-end rank advance in a single workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="target-year">
              Target Year
            </label>
            <Input
              id="target-year"
              value={targetYear}
              onChange={(event) => setTargetYear(event.target.value)}
              placeholder="2027"
            />
          </div>

          <div className="space-y-2 rounded-md border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(event) => setIsDryRun(event.target.checked)}
              />
              Dry run only
            </label>
            <p className="text-sm text-muted-foreground">
              Dry runs generate the preview and batch record without changing ranks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={handlePreview} disabled={isLoadingPreview}>
            {isLoadingPreview ? 'Generating preview...' : 'Preview rollover'}
          </Button>
          <Button type="button" onClick={handleExecute} disabled={isExecuting}>
            {isExecuting ? 'Starting rollover...' : isDryRun ? 'Queue dry run' : 'Execute rollover'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {preview && (
          <div className="space-y-3 rounded-md border bg-slate-50 p-4">
            <div className="text-sm font-semibold">Preview Summary</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white p-3">
                <div className="text-xs uppercase text-muted-foreground">Dens</div>
                <div className="text-lg font-semibold">{preview.previewSummary.totalDens}</div>
              </div>
              <div className="rounded-md bg-white p-3">
                <div className="text-xs uppercase text-muted-foreground">Children</div>
                <div className="text-lg font-semibold">{preview.previewSummary.totalChildren}</div>
              </div>
              <div className="rounded-md bg-white p-3">
                <div className="text-xs uppercase text-muted-foreground">Graduating</div>
                <div className="text-lg font-semibold">{preview.previewSummary.graduatingScouts}</div>
              </div>
            </div>

            <div className="space-y-2 rounded-md bg-white p-3">
              <div className="text-sm font-semibold">Children by rank</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {preview.previewSummary.byRank.map((rank) => (
                  <div key={rank.currentRank} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <div className="font-medium">
                      {rank.currentRank}: {rank.count}
                    </div>
                    <div className="text-muted-foreground">Next rank: {rank.nextRank}</div>
                  </div>
                ))}
              </div>
            </div>

            <Textarea
              readOnly
              value={preview.previewSummary.denChanges
                .map((den) => `${den.denName} (den ${den.denNumber}): ${den.currentRank} → ${den.nextRank}`)
                .join('\n')}
              className="min-h-[120px]"
            />
          </div>
        )}

        {result && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="font-medium">Rollover queued</div>
            <div>{result.message}</div>
            <div className="text-blue-800">Batch ID: {result.batchId}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}