/**
 * Configuration API Service
 * 
 * Client-side service for pack configuration and activity types
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
};

export default configService;
