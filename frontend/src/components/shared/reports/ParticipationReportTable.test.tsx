import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParticipationReportTable } from './ParticipationReportTable';

/**
 * ParticipationReportTable Component Tests
 * Feature: 001-volunteer-management - User Story 9
 */

describe('ParticipationReportTable', () => {
  const mockSummaryReport = {
    period: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    },
    stats: {
      totalVolunteers: 50,
      totalEvents: 25,
      totalSignups: 120,
      averageSignupsPerEvent: 4.8,
      uniqueVolunteersParticipated: 45,
    },
    topVolunteers: [
      {
        volunteer: { id: '1', name: 'John Doe' },
        eventsParticipated: 15,
        pointsEarned: 150,
      },
      {
        volunteer: { id: '2', name: 'Jane Smith' },
        eventsParticipated: 12,
        pointsEarned: 120,
      },
    ],
    participationByRank: [
      { rankLevel: 'LION', eventsHeld: 5, totalSignups: 25 },
      { rankLevel: 'TIGER', eventsHeld: 8, totalSignups: 40 },
    ],
  };

  const mockDetailedReport = {
    period: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    },
    volunteers: [
      {
        volunteer: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          roles: [{ name: 'Den Leader' }],
        },
        eventsParticipated: 5,
        pointsEarned: 50,
        activities: [
          {
            event: {
              id: 'e1',
              title: 'Summer Camp',
              eventDate: '2026-07-15T00:00:00.000Z',
            },
            activityType: 'Setup',
            points: 10,
          },
        ],
      },
    ],
  };

  describe('Summary Format', () => {
    it('should render top volunteers table', () => {
      render(
        <ParticipationReportTable report={mockSummaryReport} format="summary" />
      );

      expect(screen.getByText('Top 10 Volunteers by Points')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('should render participation by rank table', () => {
      render(
        <ParticipationReportTable report={mockSummaryReport} format="summary" />
      );

      expect(screen.getByText('Participation by Rank Level')).toBeInTheDocument();
      expect(screen.getByText('LION')).toBeInTheDocument();
      expect(screen.getByText('TIGER')).toBeInTheDocument();
    });

    it('should show empty state when no top volunteers', () => {
      const emptyReport = {
        ...mockSummaryReport,
        topVolunteers: [],
        participationByRank: [],
      };

      render(<ParticipationReportTable report={emptyReport} format="summary" />);

      expect(
        screen.getByText('No participation data available for this period')
      ).toBeInTheDocument();
    });
  });

  describe('Detailed Format', () => {
    it('should render volunteer details', () => {
      render(
        <ParticipationReportTable report={mockDetailedReport} format="detailed" />
      );

      expect(screen.getByText('Volunteer Participation Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Roles: Den Leader')).toBeInTheDocument();
    });

    it('should render activity history', () => {
      render(
        <ParticipationReportTable report={mockDetailedReport} format="detailed" />
      );

      expect(screen.getByText('Summer Camp')).toBeInTheDocument();
      expect(screen.getByText('Setup')).toBeInTheDocument();
    });

    it('should show empty state when no volunteers', () => {
      const emptyReport = {
        ...mockDetailedReport,
        volunteers: [],
      };

      render(<ParticipationReportTable report={emptyReport} format="detailed" />);

      expect(
        screen.getByText('No volunteer participation data available for this period')
      ).toBeInTheDocument();
    });
  });
});
