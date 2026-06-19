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
    denId: string | null;
    denName: string | null;
    denNumber: number | null;
    denRankLevel: string | null;
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
  createdAt: string;
}

export interface VolunteerListItem {
  id: string;
  email: string;
  name: string;
  authTier: string;
  roles: Array<{ roleName: string }>;
  pointBalance: {
    totalPoints: number;
    currentYearPoints: number;
  };
  createdAt: string;
}

export interface VolunteerDetail extends VolunteerProfile {
  pointHistory: Array<{
    id: string;
    points: number;
    eventType: string;
    reason: string | null;
    createdAt: string;
    activityType: { name: string } | null;
  }>;
}

export interface RoleAssignment {
  assignments: Array<{
    id: string;
    roleId: string;
    roleName: string;
    denId: string | null;
    denNumber: number | null;
    assignedAt: string;
  }>;
  tierUpgraded: boolean;
}

export interface AssignableDen {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

export interface AvailableRole {
  id: string;
  name: string;
  description: string | null;
  roleType: string;
  specialty: string | null;
  rankLevel: string | null;
  grantsTier: string;
}

export interface ListVolunteersResponse {
  volunteers: VolunteerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Volunteer API service for profile and role management operations
 */
export class VolunteerApiService {
  /**
   * Get current volunteer's full profile
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
  }): Promise<Partial<VolunteerProfile>> {
    const response = await axios.put('/volunteers/me/profile', data);
    return response.data;
  }

  /**
   * Assign a role to current volunteer
   */
  async assignRole(input: { roleId: string; denIds?: string[] }): Promise<RoleAssignment> {
    const response = await axios.post<RoleAssignment>('/volunteers/me/roles', input);
    return response.data;
  }

  async getAssignableDens(params?: { rankLevel?: string }): Promise<AssignableDen[]> {
    const response = await axios.get<AssignableDen[]>('/volunteers/roles/assignable-dens', {
      params,
    });
    return response.data;
  }

  /**
   * Remove a role assignment from current volunteer
   */
  async removeRole(roleAssignmentId: string): Promise<void> {
    await axios.delete(`/volunteers/me/roles/${roleAssignmentId}`);
  }

  /**
   * Get all available volunteer roles
   */
  async getAvailableRoles(): Promise<AvailableRole[]> {
    const response = await axios.get<AvailableRole[]>('/volunteers/roles/available');
    return response.data;
  }

  /**
   * List all volunteers (Tier 2+ only)
   */
  async listVolunteers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tier?: 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';
    roleId?: string;
  }): Promise<ListVolunteersResponse> {
    const response = await axios.get<ListVolunteersResponse>('/volunteers', { params });
    return response.data;
  }

  /**
   * Get specific volunteer details (Tier 2+ or self)
   */
  async getVolunteerById(volunteerId: string): Promise<VolunteerDetail> {
    const response = await axios.get<VolunteerDetail>(`/volunteers/${volunteerId}`);
    return response.data;
  }

  /**
   * Delete a volunteer (Tier 3 only)
   */
  async deleteVolunteer(volunteerId: string): Promise<void> {
    await axios.delete(`/volunteers/${volunteerId}`);
  }
}

export const volunteerApi = new VolunteerApiService();
