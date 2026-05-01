'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * ParticipationReportTable Component
 * 
 * Displays volunteer participation report data in table format
 * Feature: 001-volunteer-management - User Story 9
 */

interface ParticipationSummaryReport {
  period: {
    startDate: string;
    endDate: string;
  };
  stats: {
    totalVolunteers: number;
    totalEvents: number;
    totalSignups: number;
    averageSignupsPerEvent: number;
    uniqueVolunteersParticipated: number;
  };
  topVolunteers: Array<{
    volunteer: {
      id: string;
      name: string;
    };
    eventsParticipated: number;
    pointsEarned: number;
  }>;
  participationByRank: Array<{
    rankLevel: string;
    eventsHeld: number;
    totalSignups: number;
  }>;
}

interface ParticipationDetailedReport {
  period: {
    startDate: string;
    endDate: string;
  };
  volunteers: Array<{
    volunteer: {
      id: string;
      name: string;
      email: string;
      roles: Array<{ name: string }>;
    };
    eventsParticipated: number;
    pointsEarned: number;
    activities: Array<{
      event: {
        id: string;
        title: string;
        eventDate: string;
      };
      activityType: string;
      points: number;
    }>;
  }>;
}

interface ParticipationReportTableProps {
  report: ParticipationSummaryReport | ParticipationDetailedReport;
  format: 'summary' | 'detailed';
}

export function ParticipationReportTable({
  report,
  format,
}: ParticipationReportTableProps) {
  if (format === 'summary') {
    const summaryReport = report as ParticipationSummaryReport;
    return (
      <div className="space-y-6">
        {/* Top Volunteers */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Volunteers by Points</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Volunteer</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Points Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryReport.topVolunteers.map((volunteer, index) => (
                  <TableRow key={volunteer.volunteer.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{volunteer.volunteer.name}</TableCell>
                    <TableCell className="text-right">
                      {volunteer.eventsParticipated}
                    </TableCell>
                    <TableCell className="text-right">
                      {volunteer.pointsEarned}
                    </TableCell>
                  </TableRow>
                ))}
                {summaryReport.topVolunteers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No participation data available for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Participation by Rank */}
        <Card>
          <CardHeader>
            <CardTitle>Participation by Rank Level</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank Level</TableHead>
                  <TableHead className="text-right">Events Held</TableHead>
                  <TableHead className="text-right">Total Signups</TableHead>
                  <TableHead className="text-right">Avg Signups/Event</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryReport.participationByRank.map((rank) => (
                  <TableRow key={rank.rankLevel}>
                    <TableCell className="font-medium">{rank.rankLevel}</TableCell>
                    <TableCell className="text-right">{rank.eventsHeld}</TableCell>
                    <TableCell className="text-right">{rank.totalSignups}</TableCell>
                    <TableCell className="text-right">
                      {rank.eventsHeld > 0
                        ? (rank.totalSignups / rank.eventsHeld).toFixed(1)
                        : '0.0'}
                    </TableCell>
                  </TableRow>
                ))}
                {summaryReport.participationByRank.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No rank data available for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detailed format
  const detailedReport = report as ParticipationDetailedReport;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Volunteer Participation Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {detailedReport.volunteers.map((volunteerData) => (
            <div key={volunteerData.volunteer.id} className="border-b pb-4 last:border-0">
              <div className="mb-2">
                <h4 className="font-semibold">{volunteerData.volunteer.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {volunteerData.volunteer.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Roles: {volunteerData.volunteer.roles.map((r) => r.name).join(', ')}
                </p>
                <div className="mt-1 flex gap-4 text-sm">
                  <span>
                    <strong>Events:</strong> {volunteerData.eventsParticipated}
                  </span>
                  <span>
                    <strong>Points:</strong> {volunteerData.pointsEarned}
                  </span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteerData.activities.map((activity, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{activity.event.title}</TableCell>
                      <TableCell>
                        {new Date(activity.event.eventDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{activity.activityType}</TableCell>
                      <TableCell className="text-right">{activity.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
          {detailedReport.volunteers.length === 0 && (
            <p className="text-center text-muted-foreground">
              No volunteer participation data available for this period
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
