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
import { Badge } from '@/components/ui/badge';

/**
 * AdminTaskReportTable Component
 * 
 * Displays administrative task completion report data in table format
 * Feature: 001-volunteer-management - User Story 9
 */

interface AdminTaskSummaryReport {
  period: {
    startDate: string;
    endDate: string;
  };
  stats: {
    totalTasks: number;
    totalCompletions: number;
    overallCompletionRate: number;
    overdueTasks: number;
  };
  taskBreakdown: Array<{
    task: {
      id: string;
      name: string;
      dueDate: string;
    };
    assignedCount: number;
    completedCount: number;
    completionRate: number;
    isOverdue: boolean;
  }>;
}

interface AdminTaskDetailedReport {
  period: {
    startDate: string;
    endDate: string;
  };
  tasks: Array<{
    task: {
      id: string;
      name: string;
      description: string | null;
      dueDate: string;
      isOverdue: boolean;
    };
    assignedVolunteers: Array<{
      volunteer: {
        id: string;
        name: string;
        email: string;
        roles: Array<{ name: string }>;
      };
      completedAt: string | null;
      isComplete: boolean;
    }>;
    stats: {
      assignedCount: number;
      completedCount: number;
      completionRate: number;
    };
  }>;
}

interface AdminTaskReportTableProps {
  report: AdminTaskSummaryReport | AdminTaskDetailedReport;
  format: 'summary' | 'detailed';
}

export function AdminTaskReportTable({
  report,
  format,
}: AdminTaskReportTableProps) {
  if (format === 'summary') {
    const summaryReport = report as AdminTaskSummaryReport;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryReport.taskBreakdown.map((task) => (
                <TableRow key={task.task.id}>
                  <TableCell className="font-medium">{task.task.name}</TableCell>
                  <TableCell>
                    {new Date(task.task.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">{task.assignedCount}</TableCell>
                  <TableCell className="text-right">{task.completedCount}</TableCell>
                  <TableCell className="text-right">
                    {task.completionRate.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    {task.isOverdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : task.completionRate === 100 ? (
                      <Badge variant="default">Complete</Badge>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {summaryReport.taskBreakdown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No tasks found for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Detailed format
  const detailedReport = report as AdminTaskDetailedReport;
  return (
    <div className="space-y-6">
      {detailedReport.tasks.map((taskData) => (
        <Card key={taskData.task.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{taskData.task.name}</CardTitle>
                {taskData.task.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {taskData.task.description}
                  </p>
                )}
                <p className="mt-2 text-sm">
                  <strong>Due:</strong>{' '}
                  {new Date(taskData.task.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                {taskData.task.isOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : taskData.stats.completionRate === 100 ? (
                  <Badge variant="default">Complete</Badge>
                ) : (
                  <Badge variant="secondary">In Progress</Badge>
                )}
                <div className="mt-2 text-sm text-muted-foreground">
                  {taskData.stats.completedCount} / {taskData.stats.assignedCount}{' '}
                  completed ({taskData.stats.completionRate.toFixed(1)}%)
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskData.assignedVolunteers.map((assignment) => (
                  <TableRow key={assignment.volunteer.id}>
                    <TableCell className="font-medium">
                      {assignment.volunteer.name}
                    </TableCell>
                    <TableCell>{assignment.volunteer.email}</TableCell>
                    <TableCell>
                      {assignment.volunteer.roles.map((r) => r.name).join(', ')}
                    </TableCell>
                    <TableCell>
                      {assignment.completedAt
                        ? new Date(assignment.completedAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {assignment.isComplete ? (
                        <Badge variant="default">Complete</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {taskData.assignedVolunteers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No volunteers assigned to this task
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {detailedReport.tasks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tasks found for this period
          </CardContent>
        </Card>
      )}
    </div>
  );
}
