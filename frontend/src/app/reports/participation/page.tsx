'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReportFilters, type ReportFilters as FilterType } from '@/components/forms/reports/ReportFilters';
import { ParticipationReportTable } from '@/components/shared/reports/ParticipationReportTable';
import { ReportStats } from '@/components/shared/reports/ReportStats';
import {
  getParticipationReport,
  exportReportAsCSV,
  type ParticipationReportQuery,
} from '@/services/reports.service';
import { Download, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Participation Report Page
 * 
 * Generate and view volunteer participation reports
 * Feature: 001-volunteer-management - User Story 9
 * Authorization: Tier 2+ (Den leaders and committee members)
 */

export default function ParticipationReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterType>({
    format: 'summary',
  });

  const handleFilterChange = async (filters: FilterType) => {
    setLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const query: ParticipationReportQuery = {
        format: filters.format,
      };

      // Add optional filters
      if (filters.startDate) {
        query.startDate = new Date(filters.startDate).toISOString();
      }
      if (filters.endDate) {
        query.endDate = new Date(filters.endDate).toISOString();
      }
      if (filters.rankLevel) {
        query.rankLevel = filters.rankLevel;
      }

      const data = await getParticipationReport(query);
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching participation report:', err);
      setError(
        err.response?.data?.error || 'Failed to generate report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `participation-report-${currentFilters.format}-${timestamp}.csv`;
    
    exportReportAsCSV('participation', report, filename);
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Volunteer Participation Report</h1>
          <p className="mt-2 text-muted-foreground">
            View volunteer event participation, signups, and points earned
          </p>
        </div>
        {report && (
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <ReportFilters
        onFilterChange={handleFilterChange}
        showRankFilter={true}
        showStatusFilter={false}
      />

      {/* Loading State */}
      {loading && (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Generating report...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="mt-6 border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Display */}
      {!loading && !error && report && (
        <div className="mt-6 space-y-6">
          {/* Report Period */}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Report Period:{' '}
                <strong>
                  {new Date(report.period.startDate).toLocaleDateString()} -{' '}
                  {new Date(report.period.endDate).toLocaleDateString()}
                </strong>
              </p>
            </CardContent>
          </Card>

          {/* Stats (Summary Only) */}
          {currentFilters.format === 'summary' && report.stats && (
            <ReportStats stats={report.stats} type="participation" />
          )}

          {/* Report Table */}
          <ParticipationReportTable
            report={report}
            format={currentFilters.format}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !report && (
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Select filters and click &quot;Apply Filters&quot; to generate a report</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
