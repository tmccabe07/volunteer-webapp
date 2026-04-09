import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/axios';
import {
  pointsService,
  type PointsResponse,
  type LeaderboardResponse,
  type BadgeTierDefinition,
  type BadgeTierHistoryEntry,
} from './points.service';

vi.mock('@/lib/axios');

const mockAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('pointsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyPoints', () => {
    it('should fetch current user points with default pagination', async () => {
      const mockResponse: PointsResponse = {
        balance: {
          totalPoints: 150,
          currentYearPoints: 50,
          badgeTier: 'Bronze',
          rank: 5,
        },
        pointEvents: [
          {
            id: 'event-1',
            points: 25,
            eventType: 'EVENT_PARTICIPATION',
            reason: 'Pack Meeting',
            activityType: {
              name: 'Pack Meeting',
              pointValue: 25,
            },
            createdBy: {
              id: 'leader-1',
              name: 'Den Leader',
            },
            createdAt: '2024-03-01T10:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 10,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await pointsService.getMyPoints();

      expect(mockAxios.get).toHaveBeenCalledWith('/points/me', {
        params: { page: 1, limit: 50 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch points with custom pagination', async () => {
      const mockResponse: PointsResponse = {
        balance: {
          totalPoints: 150,
          currentYearPoints: 50,
          badgeTier: 'Bronze',
          rank: 5,
        },
        pointEvents: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await pointsService.getMyPoints(2, 10);

      expect(mockAxios.get).toHaveBeenCalledWith('/points/me', {
        params: { page: 2, limit: 10 },
      });
    });

    it('should filter points by year', async () => {
      const mockResponse: PointsResponse = {
        balance: {
          totalPoints: 150,
          currentYearPoints: 50,
          badgeTier: 'Bronze',
          rank: 5,
        },
        pointEvents: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 5,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await pointsService.getMyPoints(1, 50, 2023);

      expect(mockAxios.get).toHaveBeenCalledWith('/points/me', {
        params: { page: 1, limit: 50, year: 2023 },
      });
    });

    it('should handle empty point history', async () => {
      const mockResponse: PointsResponse = {
        balance: {
          totalPoints: 0,
          currentYearPoints: 0,
          badgeTier: null,
          rank: null,
        },
        pointEvents: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await pointsService.getMyPoints();

      expect(result.pointEvents).toHaveLength(0);
      expect(result.balance.totalPoints).toBe(0);
    });
  });

  describe('getVolunteerPoints', () => {
    it('should fetch specific volunteer points', async () => {
      const mockResponse: PointsResponse = {
        balance: {
          totalPoints: 200,
          currentYearPoints: 75,
          badgeTier: 'Silver',
          rank: 3,
        },
        pointEvents: [
          {
            id: 'event-1',
            points: 50,
            eventType: 'ROLE_ASSIGNMENT',
            reason: 'Den Leader',
            activityType: null,
            createdBy: {
              id: 'admin-1',
              name: 'Admin',
            },
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 8,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await pointsService.getVolunteerPoints('volunteer-123');

      expect(mockAxios.get).toHaveBeenCalledWith('/points/volunteers/volunteer-123', {
        params: { page: 1, limit: 50 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch volunteer points with year filter', async () => {
      const mockResponse: PointsResponse = {
        balance: {
          totalPoints: 200,
          currentYearPoints: 75,
          badgeTier: 'Silver',
          rank: 3,
        },
        pointEvents: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await pointsService.getVolunteerPoints('volunteer-123', 2, 20, 2023);

      expect(mockAxios.get).toHaveBeenCalledWith('/points/volunteers/volunteer-123', {
        params: { page: 2, limit: 20, year: 2023 },
      });
    });

    it('should handle unauthorized access (Tier 1 viewing others)', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' },
        },
      });

      await expect(
        pointsService.getVolunteerPoints('other-volunteer')
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });

  describe('revokePoints', () => {
    it('should revoke a point event with reason', async () => {
      const mockResponse = {
        revocationEvent: {
          id: 'revoke-1',
          points: -25,
          eventType: 'ADMIN_REVOCATION' as const,
          reason: 'Event cancelled',
          activityType: null,
          createdBy: {
            id: 'admin-1',
            name: 'Admin',
          },
          createdAt: '2024-03-15T14:30:00Z',
        },
        newBalance: {
          totalPoints: 125,
          currentYearPoints: 25,
          badgeTier: 'Bronze',
        },
      };

      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await pointsService.revokePoints('event-1', 'Event cancelled');

      expect(mockAxios.post).toHaveBeenCalledWith('/points/revoke/event-1', {
        reason: 'Event cancelled',
      });
      expect(result).toEqual(mockResponse);
      expect(result.revocationEvent.points).toBeLessThan(0);
    });

    it('should handle event not found', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Point event not found' },
        },
      });

      await expect(
        pointsService.revokePoints('invalid-event', 'Mistake')
      ).rejects.toMatchObject({
        response: { status: 404 },
      });
    });

    it('should handle unauthorized revocation (Tier 1)', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Requires Tier 2+' },
        },
      });

      await expect(
        pointsService.revokePoints('event-1', 'Oops')
      ).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard with default pagination', async () => {
      const mockResponse: LeaderboardResponse = {
        leaderboard: [
          {
            rank: 1,
            volunteer: {
              id: 'vol-1',
              name: 'Top Volunteer',
            },
            totalPoints: 500,
            badgeTier: 'Gold',
          },
          {
            rank: 2,
            volunteer: {
              id: 'vol-2',
              name: 'Second Place',
            },
            totalPoints: 350,
            badgeTier: 'Silver',
          },
        ],
        currentUser: {
          rank: 5,
          totalPoints: 150,
        },
        pagination: {
          page: 1,
          limit: 50,
          total: 42,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await pointsService.getLeaderboard();

      expect(mockAxios.get).toHaveBeenCalledWith('/leaderboard', {
        params: { page: 1, limit: 50 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch leaderboard with custom pagination', async () => {
      const mockResponse: LeaderboardResponse = {
        leaderboard: [],
        currentUser: {
          rank: null,
          totalPoints: 0,
        },
        pagination: {
          page: 2,
          limit: 25,
          total: 42,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await pointsService.getLeaderboard(2, 25);

      expect(mockAxios.get).toHaveBeenCalledWith('/leaderboard', {
        params: { page: 2, limit: 25 },
      });
    });

    it('should handle current user not on leaderboard (opted out)', async () => {
      const mockResponse: LeaderboardResponse = {
        leaderboard: [
          {
            rank: 1,
            volunteer: {
              id: 'vol-1',
              name: 'Top Volunteer',
            },
            totalPoints: 500,
            badgeTier: 'Gold',
          },
        ],
        currentUser: {
          rank: null,
          totalPoints: 150,
        },
        pagination: {
          page: 1,
          limit: 50,
          total: 20,
        },
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await pointsService.getLeaderboard();

      expect(result.currentUser.rank).toBeNull();
      expect(result.currentUser.totalPoints).toBeGreaterThan(0);
    });
  });

  describe('getAllBadgeTiers', () => {
    it('should fetch all badge tier definitions', async () => {
      const mockTiers: BadgeTierDefinition[] = [
        {
          tierName: 'Bronze',
          minPoints: 0,
          maxPoints: 99,
          displayOrder: 1,
          badgeColor: '#CD7F32',
          iconPath: '/badges/bronze.svg',
        },
        {
          tierName: 'Silver',
          minPoints: 100,
          maxPoints: 249,
          displayOrder: 2,
          badgeColor: '#C0C0C0',
          iconPath: '/badges/silver.svg',
        },
        {
          tierName: 'Gold',
          minPoints: 250,
          maxPoints: null,
          displayOrder: 3,
          badgeColor: '#FFD700',
          iconPath: '/badges/gold.svg',
        },
      ];

      mockAxios.get.mockResolvedValue({ data: { tiers: mockTiers } });

      const result = await pointsService.getAllBadgeTiers();

      expect(mockAxios.get).toHaveBeenCalledWith('/badge-tiers');
      expect(result).toEqual(mockTiers);
      expect(result).toHaveLength(3);
    });

    it('should handle empty tiers list', async () => {
      mockAxios.get.mockResolvedValue({ data: { tiers: [] } });

      const result = await pointsService.getAllBadgeTiers();

      expect(result).toEqual([]);
    });
  });

  describe('getMyBadgeTierHistory', () => {
    it('should fetch badge tier history with transitions', async () => {
      const mockHistory: BadgeTierHistoryEntry[] = [
        {
          id: 'history-1',
          oldTier: null,
          newTier: 'Bronze',
          pointsAtChange: 0,
          achievedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'history-2',
          oldTier: 'Bronze',
          newTier: 'Silver',
          pointsAtChange: 100,
          achievedAt: '2024-02-15T10:30:00Z',
        },
      ];

      mockAxios.get.mockResolvedValue({
        data: {
          currentTier: 'Silver',
          history: mockHistory,
        },
      });

      const result = await pointsService.getMyBadgeTierHistory();

      expect(mockAxios.get).toHaveBeenCalledWith('/badge-tiers/me/history');
      expect(result.currentTier).toBe('Silver');
      expect(result.history).toEqual(mockHistory);
      expect(result.history).toHaveLength(2);
    });

    it('should handle user with no badge tier', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          currentTier: null,
          history: [],
        },
      });

      const result = await pointsService.getMyBadgeTierHistory();

      expect(result.currentTier).toBeNull();
      expect(result.history).toHaveLength(0);
    });

    it('should handle single tier achievement', async () => {
      const mockHistory: BadgeTierHistoryEntry[] = [
        {
          id: 'history-1',
          oldTier: null,
          newTier: 'Bronze',
          pointsAtChange: 0,
          achievedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockAxios.get.mockResolvedValue({
        data: {
          currentTier: 'Bronze',
          history: mockHistory,
        },
      });

      const result = await pointsService.getMyBadgeTierHistory();

      expect(result.history[0].oldTier).toBeNull();
      expect(result.history[0].newTier).toBe('Bronze');
    });
  });
});
