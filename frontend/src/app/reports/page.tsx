'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Users, ClipboardCheck, Calendar } from 'lucide-react';

/**
 * Reports Dashboard Page
 * 
 * Main landing page for accessing different types of reports
 * Feature: 001-volunteer-management - User Story 9
 * Authorization: Tier 2+ (Den leaders and committee members)
 */

export default function ReportsDashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-2 text-muted-foreground">
          Generate and view reports on volunteer participation, upcoming events, and administrative task completion
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Participation Report Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Volunteer Participation Report</CardTitle>
            </div>
            <CardDescription>
              View volunteer event participation, signups, and points earned over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This report provides insights into:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Total volunteers and events</li>
                <li>Top volunteers by points earned</li>
                <li>Participation breakdown by rank level</li>
                <li>Detailed volunteer activity history</li>
              </ul>
              <Link href="/reports/participation">
                <Button className="w-full" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View Participation Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events Report Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <CardTitle>Upcoming Events & Signups</CardTitle>
            </div>
            <CardDescription>
              View upcoming volunteer events and who has signed up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This report provides insights into:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Upcoming events and their dates</li>
                <li>Volunteer signups per event</li>
                <li>Available spots and capacity</li>
                <li>Contact information for volunteers</li>
              </ul>
              <Link href="/reports/upcoming-events">
                <Button className="w-full" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View Upcoming Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Administrative Tasks Report Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <CardTitle>Administrative Tasks Report</CardTitle>
            </div>
            <CardDescription>
              Track administrative task completion rates and overdue tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This report provides insights into:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Overall task completion rates</li>
                <li>Overdue tasks requiring attention</li>
                <li>Task completion by volunteer</li>
                <li>Historical completion trends</li>
              </ul>
              <Link href="/reports/administrative-tasks">
                <Button className="w-full" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View Admin Tasks Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Report Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Date Ranges:</strong> Use the date filters to focus on specific time periods. By default, reports show data for the current pack year.
            </p>
            <p>
              <strong>Summary vs Detailed:</strong> Summary reports provide high-level statistics and trends. Detailed reports show individual volunteer or task data.
            </p>
            <p>
              <strong>Export to CSV:</strong> All reports can be exported to CSV format for further analysis in spreadsheet applications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
