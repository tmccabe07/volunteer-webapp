'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * ReportStats Component
 * 
 * Displays high-level statistics for reports
 * Feature: 001-volunteer-management - User Story 9
 */

interface ParticipationStats {
  totalVolunteers: number;
  totalEvents: number;
  totalSignups: number;
  averageSignupsPerEvent: number;
  uniqueVolunteersParticipated: number;
}

interface AdminTaskStats {
  totalTasks: number;
  totalCompletions: number;
  overallCompletionRate: number;
  overdueTasks: number;
}

interface ReportStatsProps {
  stats: ParticipationStats | AdminTaskStats;
  type: 'participation' | 'adminTask';
}

export function ReportStats({ stats, type }: ReportStatsProps) {
  if (type === 'participation') {
    const participationStats = stats as ParticipationStats;
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Volunteers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participationStats.totalVolunteers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participationStats.totalEvents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participationStats.totalSignups}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Signups/Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participationStats.averageSignupsPerEvent.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Volunteers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {participationStats.uniqueVolunteersParticipated}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin task stats
  const adminTaskStats = stats as AdminTaskStats;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{adminTaskStats.totalTasks}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Completions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {adminTaskStats.totalCompletions}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {adminTaskStats.overallCompletionRate.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {adminTaskStats.overdueTasks}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
