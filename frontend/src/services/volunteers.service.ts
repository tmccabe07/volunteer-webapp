import axios from '@/lib/axios';

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
    const response = await axios.get<VolunteerProfile>('/volunteers/me/profile');
    return response.data;
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
