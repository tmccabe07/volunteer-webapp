import axios from '@/lib/axios';

export interface DataQualityReport {
  summary: {
    olderThanDays: number;
    duplicateLinkCount: number;
    staleApprovalCount: number;
    awardReconciliationGapCount: number;
  };
  duplicateLinks: Array<{
    parentId: string;
    parentName: string;
    childScoutId: string;
    childName: string;
    relationshipType: string | null;
    status: string;
    duplicateCount: number;
  }>;
  staleApprovals: Array<{
    requirementProgressId: string;
    childScoutId: string;
    childName: string;
    adventureName: string;
    requirementText: string;
    completedAt: string;
    daysOld: number;
  }>;
  awardReconciliationGaps: Array<{
    awardItemId: string;
    childScoutId: string;
    childName: string;
    awardName: string;
    currentState: string;
    completionRatio: string;
  }>;
}

class AdminQualityService {
  async getReport(olderThanDays = 30): Promise<DataQualityReport> {
    const response = await axios.get<DataQualityReport>('/admin/data-quality', {
      params: { olderThanDays },
    });
    return response.data;
  }
}

export const adminQualityService = new AdminQualityService();