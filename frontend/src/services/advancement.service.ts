import axios from '@/lib/axios';

/**
 * Advancement types
 */
export interface Rank {
  id: string;
  rankLevel: string;
  displayName: string;
  displayOrder: number;
  requiredAdventureCount: number;
  electiveAdventureCount: number;
}

export interface Requirement {
  id: string;
  adventureId: string;
  adventureName: string;
  rankLevel: string;
  displayOrder: number;
  requirementText: string;
}

export interface Adventure {
  id: string;
  rankId: string;
  name: string;
  description?: string;
  classification: 'REQUIRED' | 'ELECTIVE' | 'SPECIAL_ELECTIVE';
  displayOrder: number;
  requirements: Requirement[];
}

export interface RankAdventures {
  rankLevel: string;
  adventures: Adventure[];
}

export interface ChildAdvancementProgress {
  childScout: {
    id: string;
    name: string;
    currentRank: string;
  };
  rankProgress: {
    rankLevel: string;
    requiredAdventuresNeeded: number;
    requiredAdventuresCompleted: number;
    electiveAdventuresNeeded: number;
    electiveAdventuresCompleted: number;
    isRankEligible: boolean;
  };
  adventures: Array<{
    id: string;
    name: string;
    classification: 'REQUIRED' | 'ELECTIVE' | 'SPECIAL_ELECTIVE';
    totalRequirements: number;
    completedRequirements: number;
    percentComplete: number;
    isComplete: boolean;
    requirements: Array<{
      id: string;
      displayOrder: number;
      requirementText: string;
      isCompleted: boolean;
      completedAt?: string;
      completedBy?: string;
      completionType?: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
      scoutbookStatus?: 'PENDING' | 'ENTERED' | 'VERIFIED';
    }>;
  }>;
}

export interface CompleteRequirementInput {
  childScoutId: string;
  completionType: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
  notes?: string;
}

export interface CompleteRequirementResponse {
  id: string;
  requirementId: string;
  childScoutId: string;
  completedAt: string;
  completedBy: string;
  completionType: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
  scoutbookStatus: 'PENDING' | 'ENTERED' | 'VERIFIED';
  version: number;
}

export interface PendingReconciliationResponse {
  data: Array<{
    id: string;
    version: number;
    childScout: {
      id: string;
      name: string;
      currentRank: string;
      denName: string;
    };
    requirement: {
      id: string;
      adventureName: string;
      requirementText: string;
    };
    completedAt: string;
    completionType: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
    daysSinceCompletion: number;
  }>;
}

export interface ReconcileRequirementInput {
  version: number;
  notes?: string;
}

export interface ReconcileRequirementResponse {
  id: string;
  scoutbookStatus: 'PENDING' | 'ENTERED' | 'VERIFIED';
  scoutbookEnteredAt?: string;
  scoutbookEnteredBy?: string;
  version: number;
}

export interface ReconcileConflictState {
  id: string;
  scoutbookStatus: 'PENDING' | 'ENTERED' | 'VERIFIED';
  version: number;
}

export interface PromptParentsForRequirementResponse {
  requirementProgressId: string;
  promptedParents: number;
  scoutbookStatus: 'PENDING' | 'ENTERED' | 'VERIFIED';
}

/**
 * Advancement API Service
 */
export class AdvancementService {
  async getRanks(): Promise<{ data: Rank[] }> {
    const response = await axios.get<{ data: Rank[] }>('/advancement/ranks');
    return response.data;
  }

  async getAdventures(rankLevel?: string): Promise<{ data: Adventure[] }> {
    const response = await axios.get<{ data: Adventure[] }>('/advancement/adventures', {
      params: rankLevel ? { rankLevel } : undefined,
    });
    return response.data;
  }

  async getRequirements(adventureId?: string): Promise<{ data: Requirement[] }> {
    const response = await axios.get<{ data: Requirement[] }>('/advancement/requirements', {
      params: adventureId ? { adventureId } : undefined,
    });
    return response.data;
  }

  /**
   * Get adventures and requirements for a specific rank
   */
  async getAdventuresForRank(rankLevel: string): Promise<RankAdventures> {
    const response = await axios.get<RankAdventures>(`/advancement/ranks/${rankLevel}/adventures`);
    return response.data;
  }

  /**
   * Get specific requirement details
   */
  async getRequirement(requirementId: string): Promise<Requirement> {
    const response = await axios.get<Requirement>(`/advancement/requirements/${requirementId}`);
    return response.data;
  }

  async getChildAdvancementProgress(childScoutId: string): Promise<ChildAdvancementProgress> {
    const response = await axios.get<ChildAdvancementProgress>(
      `/child-scouts/${childScoutId}/advancement-progress`,
    );
    return response.data;
  }

  async completeRequirement(
    requirementId: string,
    data: CompleteRequirementInput,
  ): Promise<CompleteRequirementResponse> {
    const response = await axios.post<CompleteRequirementResponse>(
      `/requirements/${requirementId}/complete`,
      data,
    );
    return response.data;
  }

  async getPendingReconciliation(params?: {
    denId?: string;
    olderThanDays?: number;
    completionType?: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
  }): Promise<PendingReconciliationResponse> {
    const response = await axios.get<PendingReconciliationResponse>(
      '/requirements/pending-reconciliation',
      {
        params,
      },
    );
    return response.data;
  }

  async reconcileRequirement(
    requirementProgressId: string,
    data: ReconcileRequirementInput,
  ): Promise<ReconcileRequirementResponse> {
    const response = await axios.patch<ReconcileRequirementResponse>(
      `/requirement-progress/${requirementProgressId}/reconcile`,
      data,
    );
    return response.data;
  }

  async promptParentsForRequirement(
    requirementProgressId: string,
    data?: { message?: string },
  ): Promise<PromptParentsForRequirementResponse> {
    const response = await axios.post<PromptParentsForRequirementResponse>(
      `/requirement-progress/${requirementProgressId}/prompt-parents`,
      data || {},
    );
    return response.data;
  }
}

// Export singleton instance
export const advancementService = new AdvancementService();
