export interface RequirementProgressResponseDto {
  id: string;
  requirementId: string;
  childScoutId: string;
  completedAt: string;
  completedBy: string;
  completionType: 'MEETING' | 'PARENT_SUBMIT' | 'LEADER_AWARD';
  scoutbookStatus: 'PENDING' | 'ENTERED' | 'VERIFIED';
  version: number;
}
