import axios from '@/lib/axios';

export type RoleScope = 'PACK' | 'RANK' | 'DEN';
export type RankLevel = 'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL' | 'PACK_WIDE';

export interface ScopedRoleAssignment {
  id: string;
  volunteerId: string;
  volunteerName: string;
  roleId: string;
  roleName: string;
  scopeType: RoleScope;
  rankLevel: RankLevel | null;
  denId: string | null;
  denNumber: number | null;
  assignedAt: string;
}

export interface AssignScopedRoleInput {
  volunteerId: string;
  roleId: string;
  scopeType: RoleScope;
  denNumber?: number;
  rankLevel?: RankLevel;
}

class RoleService {
  async assignScoped(input: AssignScopedRoleInput): Promise<ScopedRoleAssignment> {
    const response = await axios.post<ScopedRoleAssignment>('/roles/assign-scoped', input);
    return response.data;
  }

  async listAssignments(volunteerId?: string): Promise<ScopedRoleAssignment[]> {
    const response = await axios.get<ScopedRoleAssignment[]>('/roles/assignments', {
      params: volunteerId ? { volunteerId } : undefined,
    });
    return response.data;
  }

  async removeAssignment(assignmentId: string): Promise<void> {
    await axios.delete(`/roles/assignments/${assignmentId}`);
  }
}

export const roleService = new RoleService();
