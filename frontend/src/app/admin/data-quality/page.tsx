'use client';

import { useEffect, useState } from 'react';
import { useRequireTier } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataQualityReport from '@/components/admin/DataQualityReport';
import { adminQualityService, type DataQualityReport as ReportType } from '@/services/adminQualityService';

export default function AdminDataQualityPage() {
  const { user, isLoading } = useRequireTier('ADMIN');
  const [olderThanDays, setOlderThanDays] = useState('30');
  const [report, setReport] = useState<ReportType | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setIsLoadingReport(true);
    setError('');

    try {
      const response = await adminQualityService.getReport(Number(olderThanDays) || 30);
      setReport(response);
    } catch (loadError: any) {
      setError(loadError.response?.data?.message || 'Failed to load data quality report.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      void loadReport();
    }
  }, [isLoading, user]);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Dashboard</CardTitle>
            <CardDescription>Review duplicate links, stale approvals, and award reconciliation gaps.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <label htmlFor="older-than-days" className="block text-sm font-medium text-slate-700">
                Stale threshold (days)
              </label>
              <Input
                id="older-than-days"
                type="number"
                min={1}
                value={olderThanDays}
                onChange={(event) => setOlderThanDays(event.target.value)}
                className="sm:w-48"
              />
            </div>
            <Button type="button" onClick={loadReport} disabled={isLoadingReport}>
              {isLoadingReport ? 'Refreshing...' : 'Run checks'}
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DataQualityReport report={report} isLoading={isLoadingReport} />
      </div>
    </div>
  );
}