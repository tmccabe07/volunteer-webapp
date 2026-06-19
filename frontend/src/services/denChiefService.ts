import axios from '@/lib/axios';

export interface DenChiefAssignment {
  id: string;
  denId: string;
  denName: string;
  denNumber: number;
  validFrom: string;
  validTo: string | null;
}

export interface DenChief {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  scoutbookId: string | null;
  isActive: boolean;
  assignments: DenChiefAssignment[];
}

export interface CreateDenChiefInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  scoutbookId?: string;
}

export interface AssignDenChiefInput {
  denId: string;
  validFrom?: string;
  validTo?: string;
}

class DenChiefService {
  async create(input: CreateDenChiefInput): Promise<DenChief> {
    const response = await axios.post<DenChief>('/den-chiefs', input);
    return response.data;
  }

  async list(): Promise<DenChief[]> {
    const response = await axios.get<DenChief[]>('/den-chiefs');
    return response.data;
  }

  async assignDen(denChiefId: string, input: AssignDenChiefInput): Promise<DenChiefAssignment> {
    const response = await axios.post<DenChiefAssignment>(`/den-chiefs/${denChiefId}/assign-den`, input);
    return response.data;
  }

  async removeAssignment(denChiefId: string, assignmentId: string): Promise<void> {
    await axios.delete(`/den-chiefs/${denChiefId}/assignments/${assignmentId}`);
  }
}

export const denChiefService = new DenChiefService();
