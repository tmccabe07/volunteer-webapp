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
  eventTime?: string;
  endTime?: string;
  fullDay?: boolean;
  location?: string;
  rankLevel?: string | null;
  isRecurring?: boolean;
  activitySlots: ActivitySlot[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventDate?: string;
  eventTime?: string;
  endTime?: string;
  fullDay?: boolean;
  location?: string;
  rankLevel?: string | null;
  isRecurring?: boolean;
  activitySlots?: ActivitySlot[];
}

export interface CompleteEventData {
  manualVolunteers?: Array<{
    volunteerId: string;
    activitySlotId: string;
  }>;
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  rankLevel?: string;
  upcoming?: boolean;
  mySignups?: boolean;
}

const eventsService = {
  /**
   * List events with filters
   */
  async listEvents(params: ListEventsParams = {}) {
    const response = await axios.get('/events', { params });
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
