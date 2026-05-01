import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminTaskReportTable } from './AdminTaskReportTable';

/**
 * AdminTaskReportTable Component Tests
 * Feature: 001-volunteer-management - User Story 9
 */

describe('AdminTaskReportTable', () => {
  const mockSummaryReport = {
    period: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    },
    stats: {
      totalTasks: 10,
      totalCompletions: 45,
      overallCompletionRate: 90.0,
      overdueTasks: 2,
    },
    taskBreakdown: [
      {
        task: {
          id: '1',
          name: 'Medical Forms',
          dueDate: '2026-06-01T00:00:00.000Z',
        },
        assignedCount: 10,
        completedCount: 10,
        completionRate: 100,
        isOverdue: false,
      },
      {
        task: {
          id: '2',
          name: 'Annual Training',
          dueDate: '2026-03-01T00:00:00.000Z',
        },
        assignedCount: 8,
        completedCount: 6,
        completionRate: 75,
        isOverdue: true,
      },
    ],
  };

  const mockDetailedReport = {
    period: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    },
    tasks: [
      {
        task: {
          id: '1',
          name: 'Submit Budget',
          description: 'Annual budget submission',
          dueDate: '2026-08-01T00:00:00.000Z',
          isOverdue: false,
        },
        assignedVolunteers: [
          {
            volunteer: {
              id: 'v1',
              name: 'John Smith',
              email: 'john@example.com',
              roles: [{ name: 'Treasurer' }],
            },
            completedAt: '2026-07-15T00:00:00.000Z',
            isComplete: true,
          },
          {
            volunteer: {
              id: 'v2',
              name: 'Jane Doe',
              email: 'jane@example.com',
              roles: [{ name: 'Committee Member' }],
            },
            completedAt: null,
            isComplete: false,
          },
        ],
        stats: {
          assignedCount: 2,
          completedCount: 1,
          completionRate: 50,
        },
      },
    ],
  };

  describe('Summary Format', () => {
    it('should render task completion summary table', () => {
      render(
        <AdminTaskReportTable report={mockSummaryReport} format="summary" />
      );

      expect(screen.getByText('Task Completion Summary')).toBeInTheDocument();
      expect(screen.getByText('Medical Forms')).toBeInTheDocument();
      expect(screen.getByText('Annual Training')).toBeInTheDocument();
    });

    it('should display completion rates', () => {
      render(
        <AdminTaskReportTable report={mockSummaryReport} format="summary" />
      );

      expect(screen.getByText('100.0%')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
    });

    it('should show overdue badge for overdue tasks', () => {
      render(
        <AdminTaskReportTable report={mockSummaryReport} format="summary" />
      );

      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should show empty state when no tasks', () => {
      const emptyReport = {
        ...mockSummaryReport,
        taskBreakdown: [],
      };

      render(<AdminTaskReportTable report={emptyReport} format="summary" />);

      expect(screen.getByText('No tasks found for this period')).toBeInTheDocument();
    });
  });

  describe('Detailed Format', () => {
    it('should render task details cards', () => {
      render(
        <AdminTaskReportTable report={mockDetailedReport} format="detailed" />
      );

      expect(screen.getByText('Submit Budget')).toBeInTheDocument();
      expect(screen.getByText('Annual budget submission')).toBeInTheDocument();
    });

    it('should display assigned volunteers with completion status', () => {
      render(
        <AdminTaskReportTable report={mockDetailedReport} format="detailed" />
      );

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      
      // Check for completion status badges
      const completeBadges = screen.getAllByText('Complete');
      const pendingBadges = screen.getAllByText('Pending');
      expect(completeBadges.length).toBeGreaterThan(0);
      expect(pendingBadges.length).toBeGreaterThan(0);
    });

    it('should show completion statistics', () => {
      render(
        <AdminTaskReportTable report={mockDetailedReport} format="detailed" />
      );

      expect(screen.getByText('1 / 2 completed (50.0%)')).toBeInTheDocument();
    });

    it('should show empty state when no tasks', () => {
      const emptyReport = {
        ...mockDetailedReport,
        tasks: [],
      };

      render(<AdminTaskReportTable report={emptyReport} format="detailed" />);

      expect(screen.getByText('No tasks found for this period')).toBeInTheDocument();
    });

    it('should show empty state when task has no assigned volunteers', () => {
      const reportWithEmptyTask = {
        ...mockDetailedReport,
        tasks: [
          {
            ...mockDetailedReport.tasks[0],
            assignedVolunteers: [],
            stats: { assignedCount: 0, completedCount: 0, completionRate: 0 },
          },
        ],
      };

      render(
        <AdminTaskReportTable report={reportWithEmptyTask} format="detailed" />
      );

      expect(
        screen.getByText('No volunteers assigned to this task')
      ).toBeInTheDocument();
    });
  });
});
