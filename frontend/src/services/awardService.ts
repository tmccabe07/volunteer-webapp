import axios from '@/lib/axios';

export type AwardState = 'ELIGIBLE' | 'APPROVED' | 'PURCHASED' | 'DISTRIBUTED' | 'RECONCILED';

export interface AwardItem {
  id: string;
  childScout: {
    id: string;
    name: string;
    currentRank: string;
  };
  award: {
    type: 'ADVENTURE' | 'SPECIAL';
    name: string;
  };
  currentState: AwardState;
  quantityNeeded: number;
  createdAt: string;
  updatedAt: string;
}

export interface AwardListResponse {
  data: AwardItem[];
}

export interface TransitionAwardInput {
  toState: AwardState;
  notes?: string;
  batchId?: string;
}

export interface BatchTransitionInput {
  awardIds: string[];
  toState: AwardState;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  rankLevel: string | null;
  onHandQuantity: number;
  reorderPoint: number | null;
  unitCost: number | null;
  updatedAt: string;
}

export interface InventoryResponse {
  data: InventoryItem[];
  reorderAlerts: Array<{
    inventoryItemId: string;
    itemName: string;
    onHandQuantity: number;
    reorderPoint: number | null;
  }>;
}

export interface CreateInventoryItemInput {
  itemName: string;
  rankLevel?: 'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL' | 'PACK_WIDE' | null;
  onHandQuantity?: number;
  reorderPoint?: number | null;
  unitCost?: number | null;
}

export interface SpecialAward {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  requiresNomination: boolean;
  createdAt: string;
  updatedAt: string;
}

class AwardService {
  async getAwards(params?: {
    state?: AwardState;
    childScoutId?: string;
    adventureId?: string;
    denId?: string;
  }): Promise<AwardListResponse> {
    const response = await axios.get<AwardListResponse>('/awards', { params });
    return response.data;
  }

  async transitionAward(awardId: string, data: TransitionAwardInput) {
    const response = await axios.post(`/awards/${awardId}/transition`, data);
    return response.data;
  }

  async batchTransition(data: BatchTransitionInput) {
    const response = await axios.post('/awards/batch-transition', data);
    return response.data;
  }

  async getInventory(): Promise<InventoryResponse> {
    const response = await axios.get<InventoryResponse>('/inventory');
    return response.data;
  }

  async createInventoryItem(data: CreateInventoryItemInput): Promise<InventoryItem> {
    const response = await axios.post<InventoryItem>('/inventory', data);
    return response.data;
  }

  async adjustInventory(data: {
    inventoryItemId: string;
    quantityChange: number;
    reason: string;
    notes?: string;
    linkedBatchId?: string;
  }) {
    const response = await axios.post('/inventory/adjust', data);
    return response.data;
  }

  async createSpecialAward(data: {
    name: string;
    description?: string;
    category: string;
    requiresNomination?: boolean;
  }): Promise<SpecialAward> {
    const response = await axios.post<SpecialAward>('/special-awards', data);
    return response.data;
  }
}

export const awardService = new AwardService();
