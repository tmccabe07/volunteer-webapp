/**
 * Configuration API Service
 * 
 * Client-side service for pack configuration, volunteer roles, and activity types
 */

import axios from '@/lib/axios';

export interface ActivityType {
  id: string;
  name: string;
  pointValue: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
  description?: string | null;
}

export interface CreateActivityTypeData {
  name: string;
  pointValue: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
  description?: string;
}

export interface UpdateActivityTypeData {
  name?: string;
  pointValue?: number;
  category?: 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
  description?: string;
}

export interface PackConfig {
  id: string;
  packName: string;
  packNumber: string;
  yearStartDate: string;
  yearEndDate: string;
  activeRanks: Array<'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL'>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePackConfigData {
  packName?: string;
  packNumber?: string;
  yearStartDate?: string;
  yearEndDate?: string;
  activeRanks?: Array<'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL'>;
}

export interface VolunteerRole {
  id: string;
  name: string;
  description: string | null;
  roleType: 'PARENT_GUARDIAN' | 'COMMITTEE' | 'DEN_LEADER' | 'ASSISTANT_DEN_LEADER' | 'ASSISTANT_CUB_MASTER' | 'LION_GUIDE' | 'SCOUTER_RESERVE';
  specialty: string | null;
  rankLevel: 'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL' | null;
  grantsTier: 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface CreateVolunteerRoleData {
  name: string;
  description?: string;
  roleType: 'PARENT_GUARDIAN' | 'COMMITTEE' | 'DEN_LEADER' | 'ASSISTANT_DEN_LEADER' | 'ASSISTANT_CUB_MASTER' | 'LION_GUIDE' | 'SCOUTER_RESERVE';
  specialty?: string;
  rankLevel?: 'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL';
  grantsTier?: 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';
}

export interface UpdateVolunteerRoleData {
  name?: string;
  description?: string;
}

const configService = {
  /**
   * Get all active activity types
   */
  async getActivityTypes() {
    const response = await axios.get('/pack-config/activity-types');
    return response.data;
  },

  /**
   * Create a new activity type (Tier 3 only)
   */
  async createActivityType(data: CreateActivityTypeData) {
    const response = await axios.post('/pack-config/activity-types', data);
    return response.data;
  },

  /**
   * Update an existing activity type (Tier 3 only)
   */
  async updateActivityType(id: string, data: UpdateActivityTypeData) {
    const response = await axios.put(`/pack-config/activity-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete an activity type (Tier 3 only)
   */
  async deleteActivityType(id: string) {
    await axios.delete(`/pack-config/activity-types/${id}`);
  },

  /**
   * Get current pack configuration (Tier 1+)
   */
  async getPackConfig(): Promise<PackConfig> {
    const response = await axios.get('/pack-config');
    return response.data;
  },

  /**
   * Update pack configuration (Tier 3 only)
   */
  async updatePackConfig(data: UpdatePackConfigData): Promise<PackConfig> {
    const response = await axios.put('/pack-config', data);
    return response.data;
  },

  /**
   * Get all active volunteer roles (Tier 1+)
   */
  async getVolunteerRoles(): Promise<{ roles: VolunteerRole[] }> {
    const response = await axios.get('/pack-config/volunteer-roles');
    return response.data;
  },

  /**
   * Create a new volunteer role (Tier 3 only)
   */
  async createVolunteerRole(data: CreateVolunteerRoleData): Promise<VolunteerRole> {
    const response = await axios.post('/pack-config/volunteer-roles', data);
    return response.data;
  },

  /**
   * Update an existing volunteer role (Tier 3 only)
   */
  async updateVolunteerRole(id: string, data: UpdateVolunteerRoleData): Promise<VolunteerRole> {
    const response = await axios.put(`/pack-config/volunteer-roles/${id}`, data);
    return response.data;
  },

  /**
   * Delete a volunteer role (Tier 3 only)
   */
  async deleteVolunteerRole(id: string): Promise<void> {
    await axios.delete(`/pack-config/volunteer-roles/${id}`);
  },
};

export default configService;
