import axios from '@/lib/axios';

/**
 * Den types
 */
export interface DenListItem {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
  isActive: boolean;
  currentMemberCount: number;
  leaders: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export interface DenRosterMember {
  id: string;
  firstName: string;
  lastName: string;
  memberSince: string;
  parents: Array<{
    name: string;
    email: string;
    relationshipType: string;
  }>;
}

export interface DenRoster {
  den: {
    id: string;
    name: string;
    denNumber: number;
    rankLevel: string;
  };
  members: DenRosterMember[];
}

export interface CreateDenData {
  name: string;
  denNumber: number;
  rankLevel: string;
}

export interface AssignDenMemberData {
  childScoutId: string;
  effectiveDate?: string;
  reason?: string;
}

export interface ListDensParams {
  rankLevel?: string;
  isActive?: boolean;
}

export interface ListDensResponse {
  data: DenListItem[];
}

/**
 * Den API Service
 */
export class DenService {
  /**
   * List dens with filtering
   */
  async listDens(params: ListDensParams = {}): Promise<ListDensResponse> {
    const response = await axios.get<ListDensResponse>('/dens', { params });
    return response.data;
  }

  /**
   * Get den roster
   */
  async getDenRoster(denId: string): Promise<DenRoster> {
    const response = await axios.get<DenRoster>(`/dens/${denId}/roster`);
    return response.data;
  }

  /**
   * Create a new den (ADMIN only)
   */
  async createDen(data: CreateDenData): Promise<DenListItem> {
    const response = await axios.post<DenListItem>('/dens', data);
    return response.data;
  }

  /**
   * Assign child to den (LEADER or ADMIN)
   */
  async assignChildToDen(denId: string, data: AssignDenMemberData): Promise<any> {
    const response = await axios.post(`/dens/${denId}/members`, data);
    return response.data;
  }

  /**
   * Remove child from den (LEADER or ADMIN)
   */
  async removeChildFromDen(denId: string, childScoutId: string): Promise<any> {
    const response = await axios.delete(`/dens/${denId}/members/${childScoutId}`);
    return response.data;
  }

  /**
   * Delete den (soft delete, ADMIN only)
   */
  async deleteDen(denId: string): Promise<void> {
    await axios.delete(`/dens/${denId}`);
  }
}

// Export singleton instance
export const denService = new DenService();
