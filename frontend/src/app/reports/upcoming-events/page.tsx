'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFilters, type ReportFilters as FilterType } from '@/components/forms/reports/ReportFilters';
import {
  getUpcomingEventsReport,
  exportReportAsCSV,
  type UpcomingEventsReportQuery,
} from '@/services/reports.service';
import { Download, ArrowLeft, Loader2, Calendar, Users, MapPin } from 'lucide-react';
import Link from 'next/link';

/**
 * Upcoming Events Report Page
 * 
 * Generate and view upcoming events with volunteer signups
 * Authorization: Tier 2+ (Den leaders and committee members)
 */

export default function UpcomingEventsReportPage() {
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
      const query: UpcomingEventsReportQuery = {};

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

      const data = await getUpcomingEventsReport(query);
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching upcoming events report:', err);
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
    const filename = `upcoming-events-report-${timestamp}.csv`;
    
    exportReportAsCSV('upcomingEvents', report, filename);
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
          <h1 className="text-3xl font-bold">Upcoming Events & Signups</h1>
          <p className="mt-2 text-muted-foreground">
            View upcoming volunteer events and signup status
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
      />

      {/* Loading State */}
      {loading && (
        <Card className="mt-6">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Generating report...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardContent className="py-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {report && !loading && (
        <>
          {/* Summary Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Events
                  </p>
                  <p className="text-2xl font-bold">
                    {report.summary.totalEvents}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Signups
                  </p>
                  <p className="text-2xl font-bold">
                    {report.summary.totalSignups}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Unique Volunteers
                  </p>
                  <p className="text-2xl font-bold">
                    {report.summary.uniqueVolunteers}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Signups/Event
                  </p>
                  <p className="text-2xl font-bold">
                    {report.summary.averageSignupsPerEvent.toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <div className="mt-6 space-y-4">
            {report.events.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    No upcoming events found for the selected criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              report.events.map((event: any) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{event.title}</CardTitle>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-4 w-4" />
                            {new Date(event.eventDate).toLocaleDateString()}
                          </span>
                          {event.location && (
                            <span className="flex items-center">
                              <MapPin className="mr-1 h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                            {event.rankLevel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {event.totalSignups} signed up
                        </span>
                      </div>
                    </div>
                    {event.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {event.activitySlots.map((slot: any) => (
                        <div
                          key={slot.id}
                          className="rounded-lg border bg-muted/50 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-semibold">{slot.activityType}</h4>
                            <div className="text-sm">
                              <span className="font-medium">
                                {slot.signupsCount}
                              </span>
                              {slot.capacity && (
                                <>
                                  <span className="text-muted-foreground">
                                    {' '}
                                    / {slot.capacity}
                                  </span>
                                  {slot.spotsRemaining !== null && (
                                    <span
                                      className={`ml-2 ${
                                        slot.spotsRemaining === 0
                                          ? 'text-red-600'
                                          : 'text-green-600'
                                      }`}
                                    >
                                      ({slot.spotsRemaining} spots left)
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {slot.signups.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No volunteers signed up yet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {slot.signups.map((signup: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {signup.volunteer.name}
                                    </span>
                                    {signup.volunteer.roles.length > 0 && (
                                      <span className="ml-2 text-muted-foreground">
                                        (
                                        {signup.volunteer.roles
                                          .map((r: any) => r.name)
                                          .join(', ')}
                                        )
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground">
                                    {signup.volunteer.email}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Empty State (no report generated yet) */}
      {!report && !loading && !error && (
        <Card className="mt-6">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Select filters and click &quot;Apply Filters&quot; to generate the report.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
