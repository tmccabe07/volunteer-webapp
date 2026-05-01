import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportStats } from './ReportStats';

/**
 * ReportStats Component Tests
 * Feature: 001-volunteer-management - User Story 9
 */

describe('ReportStats', () => {
  describe('Participation Stats', () => {
    const mockParticipationStats = {
      totalVolunteers: 50,
      totalEvents: 25,
      totalSignups: 120,
      averageSignupsPerEvent: 4.8,
      uniqueVolunteersParticipated: 45,
    };

    it('should render all participation statistics', () => {
      render(
        <ReportStats stats={mockParticipationStats} type="participation" />
      );

      expect(screen.getByText('Total Volunteers')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();

      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();

      expect(screen.getByText('Total Signups')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();

      expect(screen.getByText('Avg Signups/Event')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();

      expect(screen.getByText('Active Volunteers')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('Admin Task Stats', () => {
    const mockAdminTaskStats = {
      totalTasks: 15,
      totalCompletions: 120,
      overallCompletionRate: 85.5,
      overdueTasks: 3,
    };

    it('should render all admin task statistics', () => {
      render(<ReportStats stats={mockAdminTaskStats} type="adminTask" />);

      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();

      expect(screen.getByText('Total Completions')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();

      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('85.5%')).toBeInTheDocument();

      expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should format completion rate to one decimal place', () => {
      const stats = {
        totalTasks: 10,
        totalCompletions: 55,
        overallCompletionRate: 91.66666,
        overdueTasks: 0,
      };

      render(<ReportStats stats={stats} type="adminTask" />);

      expect(screen.getByText('91.7%')).toBeInTheDocument();
    });
  });
});
