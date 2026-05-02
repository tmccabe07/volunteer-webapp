/**
 * NotificationService Unit Tests
 * 
 * Tests notification creation, retrieval, mark-as-read, and pagination logic
 */

import { NotificationService } from './notification.service';
import { prisma } from '../utils/prisma';
import { NotificationType } from '@prisma/client';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  const mockVolunteerId = 'volunteer-123';
  const mockNotificationId = 'notification-456';

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with correct data', async () => {
      const notificationData = {
        volunteerId: mockVolunteerId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: 'Congratulations! You earned the Bronze badge!',
      };

      const mockCreatedNotification = {
        id: mockNotificationId,
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      };

      (prisma.notification.create as jest.Mock).mockResolvedValue(mockCreatedNotification);

      const result = await service.createNotification(notificationData);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          volunteerId: mockVolunteerId,
          type: NotificationType.BADGE_ACHIEVEMENT,
          message: 'Congratulations! You earned the Bronze badge!',
          isRead: false,
        },
      });
      expect(result).toEqual(mockCreatedNotification);
    });

    it('should create notifications with different types', async () => {
      const types: NotificationType[] = [
        NotificationType.BADGE_ACHIEVEMENT,
        NotificationType.TASK_COMPLETION,
        NotificationType.EVENT_REMINDER,
        NotificationType.POINT_AWARD,
        NotificationType.POINT_REVOCATION,
      ];

      for (const type of types) {
        (prisma.notification.create as jest.Mock).mockResolvedValue({
          id: mockNotificationId,
          volunteerId: mockVolunteerId,
          type,
          message: `Test message for ${type}`,
          isRead: false,
          createdAt: new Date(),
        });

        await service.createNotification({
          volunteerId: mockVolunteerId,
          type,
          message: `Test message for ${type}`,
        });
      }

      expect(prisma.notification.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('getNotifications', () => {
    it('should fetch notifications with default pagination', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          volunteerId: mockVolunteerId,
          type: NotificationType.BADGE_ACHIEVEMENT,
          message: 'Badge earned',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
      (prisma.notification.count as jest.Mock)
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unread

      const result = await service.getNotifications(mockVolunteerId);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { volunteerId: mockVolunteerId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
      expect(result.notifications).toEqual(mockNotifications);
      expect(result.pagination).toEqual({
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      });
      expect(result.unreadCount).toBe(1);
    });

    it('should fetch notifications with custom pagination', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotifications(mockVolunteerId, {
        limit: 10,
        offset: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { volunteerId: mockVolunteerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should fetch only unread notifications when unreadOnly is true', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      await service.getNotifications(mockVolunteerId, {
        unreadOnly: true,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { volunteerId: mockVolunteerId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should calculate hasMore correctly', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.count as jest.Mock)
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(10); // unread

      const result = await service.getNotifications(mockVolunteerId, {
        limit: 20,
        offset: 0,
      });

      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(5);

      const count = await service.getUnreadCount(mockVolunteerId);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          volunteerId: mockVolunteerId,
          isRead: false,
        },
      });
      expect(count).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      const count = await service.getUnreadCount(mockVolunteerId);

      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read when found and owned by user', async () => {
      const mockNotification = {
        id: mockNotificationId,
        volunteerId: mockVolunteerId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: 'Test',
        isRead: false,
        createdAt: new Date(),
      };

      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(mockNotification);
      (prisma.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead(mockNotificationId, mockVolunteerId);

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockNotificationId,
          volunteerId: mockVolunteerId,
        },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: { isRead: true },
      });
      expect(result.isRead).toBe(true);
    });

    it('should throw error when notification not found', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead(mockNotificationId, mockVolunteerId)
      ).rejects.toThrow('Notification not found or access denied');

      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(mockVolunteerId);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          volunteerId: mockVolunteerId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      expect(result.count).toBe(3);
    });

    it('should return 0 count when no unread notifications', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead(mockVolunteerId);

      expect(result.count).toBe(0);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete read notifications older than specified days', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      (prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await service.deleteOldNotifications(30);

      expect(prisma.notification.deleteMany).toHaveBeenCalled();
      const callArgs = (prisma.notification.deleteMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.isRead).toBe(true);
      expect(callArgs.where.createdAt.lt).toBeInstanceOf(Date);
      expect(result.count).toBe(10);
    });

    it('should use default 30 days if not specified', async () => {
      (prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await service.deleteOldNotifications();

      expect(prisma.notification.deleteMany).toHaveBeenCalled();
    });
  });
});
