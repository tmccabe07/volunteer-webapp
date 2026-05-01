import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/axios';
import {
  getParticipationReport,
  getAdminTaskReport,
  exportReportAsCSV,
} from './reports.service';

/**
 * Reports Service Tests
 * Feature: 001-volunteer-management - User Story 9
 */

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Reports Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getParticipationReport', () => {
    it('should fetch participation report with all query parameters', async () => {
      const mockResponse = {
        data: {
          period: { startDate: '2026-01-01', endDate: '2026-12-31' },
          stats: { totalVolunteers: 50 },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const query = {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        rankLevel: 'LION',
        format: 'summary' as const,
      };

      const result = await getParticipationReport(query);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/reports/participation')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-01-01')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2026-12-31')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('rankLevel=LION')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('format=summary')
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle optional query parameters', async () => {
      const mockResponse = { data: {} };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await getParticipationReport({ format: 'detailed' });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('format=detailed')
      );
    });
  });

  describe('getAdminTaskReport', () => {
    it('should fetch admin task report with all query parameters', async () => {
      const mockResponse = {
        data: {
          period: { startDate: '2026-01-01', endDate: '2026-12-31' },
          stats: { totalTasks: 10 },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const query = {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'complete',
        taskId: 'task123',
        format: 'summary' as const,
      };

      const result = await getAdminTaskReport(query);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/reports/administrative-tasks')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-01-01')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=complete')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('taskId=task123')
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('exportReportAsCSV', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let clickSpy: any;

    beforeEach(() => {
      // Mock DOM methods
      clickSpy = vi.fn();
      const mockLink = {
        setAttribute: vi.fn(),
        style: { visibility: '' },
        click: clickSpy,
      };

      createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockLink as any);
      appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockLink as any);
      removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => mockLink as any);

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should export participation summary report as CSV', () => {
      const mockData = {
        topVolunteers: [
          {
            volunteer: { name: 'John Doe' },
            eventsParticipated: 10,
            pointsEarned: 100,
          },
        ],
      };

      exportReportAsCSV('participation', mockData, 'test.csv');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should export participation detailed report as CSV', () => {
      const mockData = {
        volunteers: [
          {
            volunteer: {
              name: 'John Doe',
              email: 'john@example.com',
              roles: [{ name: 'Leader' }],
            },
            eventsParticipated: 5,
            pointsEarned: 50,
          },
        ],
      };

      exportReportAsCSV('participation', mockData, 'detailed.csv');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should export admin task summary report as CSV', () => {
      const mockData = {
        taskBreakdown: [
          {
            task: {
              name: 'Training',
              dueDate: '2026-06-01T00:00:00.000Z',
            },
            assignedCount: 10,
            completedCount: 8,
            completionRate: 80,
            isOverdue: false,
          },
        ],
      };

      exportReportAsCSV('adminTask', mockData, 'tasks.csv');

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should export admin task detailed report as CSV', () => {
      const mockData = {
        tasks: [
          {
            task: {
              name: 'Medical Forms',
              dueDate: '2026-05-01T00:00:00.000Z',
            },
            assignedVolunteers: [
              {
                volunteer: {
                  name: 'Jane Smith',
                  email: 'jane@example.com',
                  roles: [{ name: 'Parent' }],
                },
                completedAt: '2026-04-15T00:00:00.000Z',
                isComplete: true,
              },
            ],
          },
        ],
      };

      exportReportAsCSV('adminTask', mockData, 'detailed-tasks.csv');

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
