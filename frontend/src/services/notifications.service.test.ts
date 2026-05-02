/**
 * Notifications Service Tests
 * 
 * Tests notifications API client methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsApiService } from './notifications.service';
import axios from '@/lib/axios';

vi.mock('@/lib/axios');

describe('NotificationsApiService', () => {
  let service: NotificationsApiService;
  const mockAxios = axios as any;

  beforeEach(() => {
    service = new NotificationsApiService();
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications with default parameters', async () => {
      const mockResponse = {
        notifications: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        unreadCount: 0,
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getNotifications();

      expect(mockAxios.get).toHaveBeenCalledWith('/notifications');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch notifications with custom limit and offset', async () => {
      const mockResponse = {
        notifications: [],
        pagination: { total: 0, limit: 10, offset: 20, hasMore: false },
        unreadCount: 0,
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await service.getNotifications({ limit: 10, offset: 20 });

      expect(mockAxios.get).toHaveBeenCalledWith('/notifications?limit=10&offset=20');
    });

    it('should fetch only unread notifications when unreadOnly is true', async () => {
      const mockResponse = {
        notifications: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        unreadCount: 0,
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await service.getNotifications({ unreadOnly: true });

      expect(mockAxios.get).toHaveBeenCalledWith('/notifications?unreadOnly=true');
    });

    it('should build query string with all parameters', async () => {
      const mockResponse = {
        notifications: [],
        pagination: { total: 0, limit: 5, offset: 10, hasMore: false },
        unreadCount: 0,
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await service.getNotifications({ limit: 5, offset: 10, unreadOnly: true });

      expect(mockAxios.get).toHaveBeenCalledWith('/notifications?limit=5&offset=10&unreadOnly=true');
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockAxios.get.mockRejectedValue(error);

      await expect(service.getNotifications()).rejects.toThrow('Network error');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockResponse = {
        message: 'Notification marked as read',
        notification: {
          id: 'notif-123',
          volunteerId: 'vol-123',
          type: 'BADGE_ACHIEVEMENT',
          message: 'Test notification',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await service.markAsRead('notif-123');

      expect(mockAxios.put).toHaveBeenCalledWith('/notifications/notif-123/read');
      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 errors', async () => {
      const error = { response: { status: 404, data: { message: 'Notification not found' } } };
      mockAxios.put.mockRejectedValue(error);

      await expect(service.markAsRead('invalid-id')).rejects.toEqual(error);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockResponse = {
        message: 'All notifications marked as read',
        count: 5,
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await service.markAllAsRead();

      expect(mockAxios.put).toHaveBeenCalledWith('/notifications/read-all');
      expect(result).toEqual(mockResponse);
    });

    it('should return count of 0 when no unread notifications', async () => {
      const mockResponse = {
        message: 'All notifications marked as read',
        count: 0,
      };

      mockAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await service.markAllAsRead();

      expect(result.count).toBe(0);
    });

    it('should handle API errors', async () => {
      const error = new Error('Server error');
      mockAxios.put.mockRejectedValue(error);

      await expect(service.markAllAsRead()).rejects.toThrow('Server error');
    });
  });
});
