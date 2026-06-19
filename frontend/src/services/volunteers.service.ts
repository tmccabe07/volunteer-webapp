import axios from '@/lib/axios';

interface CurrentUserResponse {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';
  leaderboardOptIn: boolean;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
  };
  badgeTier?: {
    current: string | null;
    currentTierDetails: {
      tierName: string;
      minPoints: number;
      maxPoints: number | null;
      badgeColor: string;
    } | null;
    nextTier: {
      tierName: string;
      minPoints: number;
      badgeColor: string;
    } | null;
    pointsToNextTier: number | null;
  };
  projectedPoints?: number;
}

export interface VolunteerProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  authTier: 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';
  leaderboardOptIn: boolean;
  roles: Array<{
    id: string;
    roleId: string;
    roleName: string;
    roleType: string;
    specialty: string | null;
    rankLevel: string | null;
    assignedAt: string;
  }>;
  childrenRanks: Array<{
    id: string;
    rankLevel: string;
  }>;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
    badgeTier: string | null;
    rank: number | null;
  };
  badgeTier: {
    current: string | null;
    currentTierDetails: {
      tierName: string;
      minPoints: number;
      maxPoints: number | null;
      badgeColor: string;
    } | null;
    nextTier: {
      tierName: string;
      minPoints: number;
      badgeColor: string;
    } | null;
    pointsToNextTier: number | null;
  };
  projectedPoints: number;
  createdAt: string;
}

/**
 * Volunteers API service
 */
export class VolunteersApiService {
  /**
   * Get current volunteer's full profile including badge tier and projected points
   */
  async getMyProfile(): Promise<VolunteerProfile> {
    try {
      const response = await axios.get<VolunteerProfile>('/volunteers/me/profile');
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== 404) {
        throw error;
      }

      const meResponse = await axios.get<CurrentUserResponse>('/auth/me');
      const currentUser = meResponse.data;

      if (currentUser.authTier !== 'DEN_CHIEF') {
        throw error;
      }

      return {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        phone: currentUser.phone,
        authTier: currentUser.authTier,
        leaderboardOptIn: currentUser.leaderboardOptIn,
        roles: [],
        childrenRanks: [],
        pointBalance: {
          totalPoints: currentUser.pointBalance.totalPoints,
          currentYearPoints: currentUser.pointBalance.currentYearPoints,
          badgeTier: currentUser.badgeTier?.current ?? null,
          rank: null,
        },
        badgeTier: currentUser.badgeTier ?? {
          current: null,
          currentTierDetails: null,
          nextTier: null,
          pointsToNextTier: null,
        },
        projectedPoints: currentUser.projectedPoints ?? 0,
        createdAt: new Date(0).toISOString(),
      };
    }
  }

  /**
   * Update current volunteer's profile
   */
  async updateMyProfile(data: {
    name?: string;
    phone?: string | null;
    leaderboardOptIn?: boolean;
  }): Promise<VolunteerProfile> {
    const response = await axios.put<VolunteerProfile>('/volunteers/me/profile', data);
    return response.data;
  }

  /**
   * List all volunteers (LEADER/ADMIN only)
   */
  async listAllVolunteers(): Promise<{ volunteers: Array<{ id: string; name: string; email: string }> }> {
    const response = await axios.get<{ volunteers: Array<{ id: string; name: string; email: string }> }>('/volunteers');
    return response.data;
  }
}

export const volunteersService = new VolunteersApiService();
export default volunteersService;
