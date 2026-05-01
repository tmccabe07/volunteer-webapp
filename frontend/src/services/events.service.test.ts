import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import eventsService from './events.service';
import axios from '@/lib/axios';

// Mock axios
vi.mock('@/lib/axios');

describe('Events Service', () => {
  const mockAxios = axios as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listEvents', () => {
    it('should fetch events with default params', async () => {
      const mockResponse = {
        data: {
          events: [{ id: 'event-1', title: 'Test Event' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.listEvents();

      expect(mockAxios.get).toHaveBeenCalledWith('/events', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch events with all filters', async () => {
      const mockResponse = {
        data: {
          events: [],
          pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
        },
      };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const params = {
        page: 2,
        limit: 10,
        rankLevel: 'WOLF',
        upcoming: true,
        mySignups: true,
      };

      const result = await eventsService.listEvents(params);

      expect(mockAxios.get).toHaveBeenCalledWith('/events', { params });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockAxios.get.mockRejectedValueOnce(error);

      await expect(eventsService.listEvents()).rejects.toThrow('Network error');
    });
  });

  describe('getEvent', () => {
    it('should fetch single event by ID', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Pack Meeting',
        eventDate: '2026-05-15T18:00:00Z',
        location: 'Church Hall',
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockEvent });

      const result = await eventsService.getEvent('event-1');

      expect(mockAxios.get).toHaveBeenCalledWith('/events/event-1');
      expect(result).toEqual(mockEvent);
    });

    it('should handle 404 errors', async () => {
      const error = { response: { status: 404, data: { error: 'Event not found' } } };
      mockAxios.get.mockRejectedValueOnce(error);

      await expect(eventsService.getEvent('invalid-id')).rejects.toEqual(error);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'New Event',
        description: 'Test description',
        eventDate: '2026-06-01T18:00:00Z',
        eventTime: '18:00',
        location: 'Test Location',
        rankLevel: 'WOLF',
        isRecurring: false,
        activitySlots: [{ activityTypeId: 'activity-1', capacity: 10 }],
      };

      const mockResponse = {
        data: {
          id: 'event-new',
          ...eventData,
        },
      };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.createEvent(eventData);

      expect(mockAxios.post).toHaveBeenCalledWith('/events', eventData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should create event with minimal data', async () => {
      const eventData = {
        title: 'Minimal Event',
        eventDate: '2026-06-01T18:00:00Z',
        activitySlots: [{ activityTypeId: 'activity-1' }],
      };

      const mockResponse = { data: { id: 'event-new', ...eventData } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.createEvent(eventData);

      expect(mockAxios.post).toHaveBeenCalledWith('/events', eventData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle validation errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { details: ['Title is required'] },
        },
      };
      mockAxios.post.mockRejectedValueOnce(error);

      await expect(
        eventsService.createEvent({
          title: '',
          eventDate: '2026-06-01T18:00:00Z',
          activitySlots: [],
        })
      ).rejects.toEqual(error);
    });
  });

  describe('updateEvent', () => {
    it('should update an event', async () => {
      const updateData = {
        title: 'Updated Event',
        location: 'New Location',
      };

      const mockResponse = {
        data: {
          id: 'event-1',
          ...updateData,
        },
      };
      mockAxios.put.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.updateEvent('event-1', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/events/event-1', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should update with all fields', async () => {
      const updateData = {
        title: 'Updated Event',
        description: 'Updated description',
        eventDate: '2026-07-01T19:00:00Z',
        eventTime: '19:00',
        location: 'New Location',
        rankLevel: 'BEAR',
        isRecurring: true,
        activitySlots: [
          { activityTypeId: 'activity-1', capacity: 5 },
          { activityTypeId: 'activity-2', capacity: null },
        ],
      };

      mockAxios.put.mockResolvedValueOnce({ data: { id: 'event-1', ...updateData } });

      const result = await eventsService.updateEvent('event-1', updateData);

      expect(mockAxios.put).toHaveBeenCalledWith('/events/event-1', updateData);
      expect(result.id).toEqual('event-1');
    });

    it('should handle authorization errors', async () => {
      const error = {
        response: {
          status: 403,
          data: { error: 'Insufficient permissions' },
        },
      };
      mockAxios.put.mockRejectedValueOnce(error);

      await expect(
        eventsService.updateEvent('event-1', { title: 'Updated' })
      ).rejects.toEqual(error);
    });
  });

  describe('completeEvent', () => {
    it('should complete event without manual volunteers', async () => {
      const mockResponse = {
        data: {
          message: 'Event completed successfully',
          pointsAwarded: 15,
        },
      };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.completeEvent('event-1');

      expect(mockAxios.post).toHaveBeenCalledWith('/events/event-1/complete', {});
      expect(result).toEqual(mockResponse.data);
    });

    it('should complete event with manual volunteers', async () => {
      const completeData = {
        manualVolunteers: [
          { volunteerId: 'vol-1', activitySlotId: 'slot-1' },
          { volunteerId: 'vol-2', activitySlotId: 'slot-2' },
        ],
      };

      const mockResponse = {
        data: {
          message: 'Event completed successfully',
          pointsAwarded: 30,
        },
      };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.completeEvent('event-1', completeData);

      expect(mockAxios.post).toHaveBeenCalledWith('/events/event-1/complete', completeData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle already completed error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Event already completed' },
        },
      };
      mockAxios.post.mockRejectedValueOnce(error);

      await expect(eventsService.completeEvent('event-1')).rejects.toEqual(error);
    });
  });

  describe('signupForActivity', () => {
    it('should sign up for an activity slot', async () => {
      const mockResponse = {
        data: {
          message: 'Successfully signed up',
          signup: {
            id: 'signup-1',
            volunteerId: 'vol-1',
            activitySlotId: 'slot-1',
          },
        },
      };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.signupForActivity('event-1', 'slot-1');

      expect(mockAxios.post).toHaveBeenCalledWith('/events/event-1/slots/slot-1/signup');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle slot full error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Activity slot is full' },
        },
      };
      mockAxios.post.mockRejectedValueOnce(error);

      await expect(
        eventsService.signupForActivity('event-1', 'slot-1')
      ).rejects.toEqual(error);
    });

    it('should handle already signed up error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Already signed up for this activity' },
        },
      };
      mockAxios.post.mockRejectedValueOnce(error);

      await expect(
        eventsService.signupForActivity('event-1', 'slot-1')
      ).rejects.toEqual(error);
    });
  });

  describe('withdrawFromActivity', () => {
    it('should withdraw from an activity slot', async () => {
      const mockResponse = {
        data: {
          message: 'Successfully withdrawn from activity',
        },
      };
      mockAxios.delete.mockResolvedValueOnce(mockResponse);

      const result = await eventsService.withdrawFromActivity('event-1', 'slot-1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/events/event-1/slots/slot-1/signup');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle not signed up error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Not signed up for this activity' },
        },
      };
      mockAxios.delete.mockRejectedValueOnce(error);

      await expect(
        eventsService.withdrawFromActivity('event-1', 'slot-1')
      ).rejects.toEqual(error);
    });

    it('should handle event completed error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Cannot withdraw from completed event' },
        },
      };
      mockAxios.delete.mockRejectedValueOnce(error);

      await expect(
        eventsService.withdrawFromActivity('event-1', 'slot-1')
      ).rejects.toEqual(error);
    });
  });

  describe('getActivityTypes', () => {
    it('should fetch activity types', async () => {
      const mockActivityTypes = [
        { id: 'activity-1', name: 'Setup', pointValue: 5, category: 'EVENT_SUPPORT' },
        { id: 'activity-2', name: 'Cleanup', pointValue: 5, category: 'EVENT_SUPPORT' },
        { id: 'activity-3', name: 'Den Leader', pointValue: 10, category: 'LEADERSHIP' },
      ];
      mockAxios.get.mockResolvedValueOnce({ data: mockActivityTypes });

      const result = await eventsService.getActivityTypes();

      expect(mockAxios.get).toHaveBeenCalledWith('/pack-config/activity-types');
      expect(result).toEqual(mockActivityTypes);
    });

    it('should handle errors when fetching activity types', async () => {
      const error = new Error('Failed to fetch activity types');
      mockAxios.get.mockRejectedValueOnce(error);

      await expect(eventsService.getActivityTypes()).rejects.toThrow(
        'Failed to fetch activity types'
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockAxios.get.mockRejectedValueOnce(networkError);

      await expect(eventsService.listEvents()).rejects.toThrow('ECONNREFUSED');
    });

    it('should propagate timeout errors', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      mockAxios.post.mockRejectedValueOnce(timeoutError);

      await expect(
        eventsService.createEvent({
          title: 'Test',
          eventDate: '2026-06-01T18:00:00Z',
          activitySlots: [],
        })
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle 500 server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };
      mockAxios.get.mockRejectedValueOnce(serverError);

      await expect(eventsService.getEvent('event-1')).rejects.toEqual(serverError);
    });
  });
});
