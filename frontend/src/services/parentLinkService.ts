import axios from '@/lib/axios';

export interface RequestChildLinkData {
  childScoutId: string;
  relationshipType?: string;
}

export interface ParentChildLinkResponse {
  id: string;
  parentId: string;
  childScoutId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  relationshipType?: string;
  requestedAt?: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface PendingLinkItem {
  id: string;
  parent: {
    id: string;
    name: string;
    email: string;
  };
  childScout: {
    id: string;
    firstName: string;
    lastName: string;
    currentRank: string;
    denId?: string;
    denName?: string;
  };
  relationshipType?: string;
  requestedAt: string;
}

export interface PendingLinksResponse {
  data: PendingLinkItem[];
}

export interface RequestableCubScoutItem {
  id: string;
  firstName: string;
  lastName: string;
  currentRank: string;
  currentDen?: {
    id: string;
    name: string;
    denNumber: number;
  } | null;
}

export interface RequestableCubScoutsResponse {
  data: RequestableCubScoutItem[];
}

export interface MyLinkedCubScoutsResponse {
  data: RequestableCubScoutItem[];
}

export interface PendingFilterDenItem {
  id: string;
  name: string;
  denNumber: number;
  rankLevel: string;
}

export interface PendingFilterDensResponse {
  data: PendingFilterDenItem[];
}

class ParentLinkService {
  async getMyLinkedCubScouts(): Promise<MyLinkedCubScoutsResponse> {
    const response = await axios.get<MyLinkedCubScoutsResponse>('/parent-child-links/my-cubs');
    return response.data;
  }

  async getRequestableCubScouts(): Promise<RequestableCubScoutsResponse> {
    const response = await axios.get<RequestableCubScoutsResponse>('/parent-child-links/requestable-cubs');
    return response.data;
  }

  async requestLink(data: RequestChildLinkData): Promise<ParentChildLinkResponse> {
    const response = await axios.post<ParentChildLinkResponse>('/parent-child-links/request', data);
    return response.data;
  }

  async getPendingLinks(denId?: string): Promise<PendingLinksResponse> {
    const response = await axios.get<PendingLinksResponse>('/parent-child-links/pending', {
      params: denId ? { denId } : undefined,
    });
    return response.data;
  }

  async getPendingFilterDens(): Promise<PendingFilterDensResponse> {
    const response = await axios.get<PendingFilterDensResponse>('/parent-child-links/pending/filter-dens');
    return response.data;
  }

  async approveLink(linkId: string): Promise<ParentChildLinkResponse> {
    const response = await axios.post<ParentChildLinkResponse>(`/parent-child-links/${linkId}/approve`);
    return response.data;
  }

  async rejectLink(linkId: string, reason: string): Promise<ParentChildLinkResponse> {
    const response = await axios.post<ParentChildLinkResponse>(`/parent-child-links/${linkId}/reject`, {
      reason,
    });
    return response.data;
  }
}

export const parentLinkService = new ParentLinkService();
