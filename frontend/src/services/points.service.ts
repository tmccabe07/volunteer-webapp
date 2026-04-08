/**
 * Points API Service
 * 
 * Client-side service for points, leaderboard, and badge tier endpoints
 */

import axios from '@/lib/axios';

export interface PointBalance {
  totalPoints: number;
  currentYearPoints: number;
  badgeTier: string | null;
  rank: number | null;
}

export interface PointEvent {
  id: string;
  points: number;
  eventType: 'EVENT_PARTICIPATION' | 'TASK_COMPLETION' | 'ROLE_ASSIGNMENT' | 'ADMIN_REVOCATION';
  reason: string | null;
  activityType: {
    name: string;
    pointValue: number;
  } | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface PointsResponse {
  balance: PointBalance;
  pointEvents: PointEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  volunteer: {
    id: string;
    name: string;
  };
  totalPoints: number;
  badgeTier: string | null;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  currentUser: {
    rank: number | null;
    totalPoints: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface BadgeTierDefinition {
  tierName: string;
  minPoints: number;
  maxPoints: number | null;
  displayOrder: number;
  badgeColor: string;
  iconPath: string | null;
}

export interface BadgeTierHistoryEntry {
  id: string;
  oldTier: string | null;
  newTier: string;
  pointsAtChange: number;
  achievedAt: string;
}

export const pointsService = {
  /**
   * Get current user's point history
   */
  async getMyPoints(page: number = 1, limit: number = 50, year?: number): Promise<PointsResponse> {
    const params: any = { page, limit };
    if (year) params.year = year;
    
    const response = await axios.get('/points/me', { params });
    return response.data;
  },

  /**
   * Get specific volunteer's point history (Tier 2+ or self)
   */
  async getVolunteerPoints(
    volunteerId: string,
    page: number = 1,
    limit: number = 50,
    year?: number
  ): Promise<PointsResponse> {
    const params: any = { page, limit };
    if (year) params.year = year;
    
    const response = await axios.get(`/points/volunteers/${volunteerId}`, { params });
    return response.data;
  },

  /**
   * Revoke a point event (Tier 2+ only)
   */
  async revokePoints(pointEventId: string, reason: string): Promise<{
    revocationEvent: PointEvent;
    newBalance: {
      totalPoints: number;
      currentYearPoints: number;
      badgeTier: string | null;
    };
  }> {
    const response = await axios.post(`/points/revoke/${pointEventId}`, { reason });
    return response.data;
  },

  /**
   * Get leaderboard rankings
   */
  async getLeaderboard(page: number = 1, limit: number = 50): Promise<LeaderboardResponse> {
    const response = await axios.get('/leaderboard', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Get all badge tier definitions
   */
  async getAllBadgeTiers(): Promise<BadgeTierDefinition[]> {
    const response = await axios.get('/badge-tiers');
    return response.data.tiers;
  },

  /**
   * Get current user's badge tier history
   */
  async getMyBadgeTierHistory(): Promise<{
    currentTier: string | null;
    history: BadgeTierHistoryEntry[];
  }> {
    const response = await axios.get('/badge-tiers/me/history');
    return response.data;
  }
};
