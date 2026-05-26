export interface ParentChildLinkResponseDto {
  id: string;
  parentId: string;
  childScoutId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  relationshipType?: string;
  requestedAt: string;
}

export interface PendingLinkListItemDto {
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
