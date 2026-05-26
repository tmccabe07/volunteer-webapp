import axios from '@/lib/axios';

/**
 * Child Scout types
 */
export interface ChildScoutListItem {
  id: string;
  firstName: string;
  lastName: string;
  currentRank: string;
  isActive: boolean;
  currentDen?: {
    id: string;
    name: string;
    denNumber: number;
  } | null;
}

export interface ChildScoutDetail {
  id: string;
  firstName: string;
  lastName: string;
  currentRank: string;
  isActive: boolean;
  scoutbookId?: string | null;
  currentDen?: {
    id: string;
    name: string;
    denNumber: number;
    rankLevel: string;
  } | null;
  parentLinks: Array<{
    id: string;
    parentName: string;
    parentEmail: string;
    relationshipType: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChildScoutData {
  firstName: string;
  lastName: string;
  currentRank: string;
  scoutbookId?: string;
}

export interface UpdateChildScoutData {
  firstName?: string;
  lastName?: string;
  currentRank?: string;
}

export interface ListChildScoutsParams {
  rankLevel?: string;
  denId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ListChildScoutsResponse {
  data: ChildScoutListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChildAttendanceHistoryResponse {
  child: {
    id: string;
    firstName: string;
    lastName: string;
  };
  attendance: Array<{
    event: {
      id: string;
      title: string;
      eventDate: string;
    };
    attendanceStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
    notes?: string | null;
    coveredRequirements: Array<{
      id: string;
      adventureName: string;
      requirementText: string;
    }>;
    recordedAt: string;
    recordedBy: string;
  }>;
}

/**
 * Child Scout API Service
 */
export class ChildScoutService {
  /**
   * List child scouts with filtering and pagination
   */
  async listChildScouts(params: ListChildScoutsParams = {}): Promise<ListChildScoutsResponse> {
    const response = await axios.get<ListChildScoutsResponse>('/child-scouts', { params });
    return response.data;
  }

  /**
   * Get child scout by ID
   */
  async getChildScout(childScoutId: string): Promise<ChildScoutDetail> {
    const response = await axios.get<ChildScoutDetail>(`/child-scouts/${childScoutId}`);
    return response.data;
  }

  /**
   * Get attendance history for a child scout
   */
  async getChildAttendance(childScoutId: string): Promise<ChildAttendanceHistoryResponse> {
    const response = await axios.get<ChildAttendanceHistoryResponse>(`/child-scouts/${childScoutId}/attendance`);
    return response.data;
  }

  /**
   * Create a new child scout (ADMIN only)
   */
  async createChildScout(data: CreateChildScoutData): Promise<ChildScoutDetail> {
    const response = await axios.post<ChildScoutDetail>('/child-scouts', data);
    return response.data;
  }

  /**
   * Update child scout (ADMIN or parent with link)
   */
  async updateChildScout(childScoutId: string, data: UpdateChildScoutData): Promise<ChildScoutDetail> {
    const response = await axios.patch<ChildScoutDetail>(`/child-scouts/${childScoutId}`, data);
    return response.data;
  }

  /**
   * Delete child scout (ADMIN only)
   */
  async deleteChildScout(childScoutId: string): Promise<void> {
    await axios.delete(`/child-scouts/${childScoutId}`);
  }
}

// Export singleton instance
export const childScoutService = new ChildScoutService();
