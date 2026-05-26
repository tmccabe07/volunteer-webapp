/**
 * Events API Service
 * 
 * Client-side service for event management operations
 */

import axios from '@/lib/axios';

export interface ActivitySlotStep {
  id?: string;
  orderIndex: number;
  stepText: string;
}

export interface ActivitySlot {
  activityTypeId: string;
  capacity?: number | null;
  description?: string;
  steps?: ActivitySlotStep[];
}

export interface CreateEventData {
  title: string;
  description?: string;
  eventDate: string;
  eventEndDate?: string;
  eventTime?: string;
  endTime?: string;
  fullDay?: boolean;
  location?: string;
  scopeType?: 'PACK_WIDE' | 'DEN';
  targetDenIds?: string[];
  rankLevel?: string | null;
  isRecurring?: boolean;
  plannedRequirementIds?: string[];
  plannedHourActivities?: {
    camping?: { enabled: boolean; nights?: number };
    hiking?: { enabled: boolean; miles?: number };
    service?: { enabled: boolean; hours?: number };
  };
  activitySlots: ActivitySlot[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventDate?: string;
  eventEndDate?: string | null;
  eventTime?: string;
  endTime?: string;
  fullDay?: boolean;
  location?: string;
  scopeType?: 'PACK_WIDE' | 'DEN';
  targetDenIds?: string[];
  rankLevel?: string | null;
  isRecurring?: boolean;
  plannedRequirementIds?: string[];
  plannedHourActivities?: {
    camping?: { enabled: boolean; nights?: number };
    hiking?: { enabled: boolean; miles?: number };
    service?: { enabled: boolean; hours?: number };
  };
  activitySlots?: ActivitySlot[];
}

export interface CompleteEventData {
  manualVolunteers?: Array<{
    volunteerId: string;
    activitySlotId: string;
  }>;
  excludedSignupIds?: string[];
}

export interface PromptRequirementParentsResponse {
  eventId: string;
  promptedRequirementProgress: number;
  promptedParents: number;
}

export interface GeneratePromptsData {
  categoryPrompts: Array<{
    category: 'CAMPING' | 'HIKING' | 'SERVICE';
    categoryData?: Record<string, unknown>;
    childScoutIds: string[];
  }>;
  syncMode?: 'ADD_ONLY' | 'SYNC_REMOVE';
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  scopeType?: 'ALL' | 'PACK_WIDE' | 'DEN';
  denIds?: string[];
  upcoming?: boolean;
  mySignups?: boolean;
}

const eventsService = {
  /**
   * List events with filters
   */
  async listEvents(params: ListEventsParams = {}) {
    const query: Record<string, string | number | boolean | undefined> = {
      ...params,
      denIds: params.denIds?.length ? params.denIds.join(',') : undefined,
    };

    const response = await axios.get('/events', { params: query });
    return response.data;
  },

  /**
   * Get single event by ID
   */
  async getEvent(eventId: string) {
    const response = await axios.get(`/events/${eventId}`);
    return response.data;
  },

  /**
   * Create a new event (Tier 2+ only)
   */
  async createEvent(data: CreateEventData) {
    const response = await axios.post('/events', data);
    return response.data;
  },

  /**
   * Update an existing event (Tier 2+ only)
   */
  async updateEvent(eventId: string, data: UpdateEventData) {
    const response = await axios.put(`/events/${eventId}`, data);
    return response.data;
  },

  /**
   * Mark event as complete and award points (Tier 2+ only)
   */
  async completeEvent(eventId: string, data: CompleteEventData = {}) {
    const response = await axios.post(`/events/${eventId}/complete`, data);
    return response.data;
  },

  /**
   * Prompt linked parents to update Scoutbook for event-covered requirements.
   */
  async promptRequirementParents(eventId: string, data?: { message?: string }) {
    const response = await axios.post<PromptRequirementParentsResponse>(
      `/events/${eventId}/prompt-requirements`,
      data || {},
    );
    return response.data;
  },

  async generateHourPrompts(eventId: string, data: GeneratePromptsData) {
    const response = await axios.post(`/events/${eventId}/generate-prompts`, data);
    return response.data;
  },

  /**
   * Sign up for an activity slot
   */
  async signupForActivity(eventId: string, activitySlotId: string) {
    const response = await axios.post(`/events/${eventId}/slots/${activitySlotId}/signup`);
    return response.data;
  },

  /**
   * Withdraw from an activity slot
   */
  async withdrawFromActivity(eventId: string, activitySlotId: string) {
    const response = await axios.delete(`/events/${eventId}/slots/${activitySlotId}/signup`);
    return response.data;
  },

  /**
   * Get available activity types (for event creation)
   */
  async getActivityTypes() {
    // This will be needed when we implement activity type management
    // For now, return empty array or fetch from a different endpoint if available
    const response = await axios.get('/pack-config/activity-types');
    return response.data;
  },
};

export default eventsService;
