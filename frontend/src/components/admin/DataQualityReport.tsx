'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DataQualityReport as ReportType } from '@/services/adminQualityService';

interface DataQualityReportProps {
  report: ReportType | null;
  isLoading?: boolean;
}

export default function DataQualityReport({ report, isLoading }: DataQualityReportProps) {
  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading data quality checks...</p>;
  }

  if (!report) {
    return <p className="text-sm text-slate-500">Run the checks to view results.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Duplicate Links</CardTitle>
            <CardDescription>Potential duplicate parent-child relationships</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{report.summary.duplicateLinkCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stale Approvals</CardTitle>
            <CardDescription>Pending reconciliations older than {report.summary.olderThanDays} days</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{report.summary.staleApprovalCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Gaps</CardTitle>
            <CardDescription>Awards not fully aligned with Scoutbook status</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{report.summary.awardReconciliationGapCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Duplicate Links</CardTitle>
        </CardHeader>
        <CardContent>
          {report.duplicateLinks.length === 0 ? (
            <p className="text-sm text-slate-500">No duplicate links detected.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.duplicateLinks.map(item => (
                <li key={`${item.parentId}-${item.childScoutId}-${item.status}`} className="rounded-md border p-3">
                  <div className="font-medium">{item.parentName} → {item.childName}</div>
                  <div className="text-slate-500">Status: {item.status} · Duplicate count: {item.duplicateCount}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stale Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {report.staleApprovals.length === 0 ? (
            <p className="text-sm text-slate-500">No stale approvals detected.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.staleApprovals.map(item => (
                <li key={item.requirementProgressId} className="rounded-md border p-3">
                  <div className="font-medium">{item.childName}</div>
                  <div className="text-slate-500">{item.adventureName} · {item.requirementText}</div>
                  <div className="text-slate-500">{item.daysOld} days old · {new Date(item.completedAt).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Award Reconciliation Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          {report.awardReconciliationGaps.length === 0 ? (
            <p className="text-sm text-slate-500">No award reconciliation gaps detected.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.awardReconciliationGaps.map(item => (
                <li key={item.awardItemId} className="rounded-md border p-3">
                  <div className="font-medium">{item.childName}</div>
                  <div className="text-slate-500">{item.awardName} · {item.currentState}</div>
                  <div className="text-slate-500">Completion: {item.completionRatio}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}