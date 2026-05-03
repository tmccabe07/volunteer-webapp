import prisma from '../utils/prisma';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  /**
   * Create a new notification for a volunteer
   */
  async createNotification(data: {
    volunteerId: string;
    type: NotificationType;
    message: string;
  }) {
    return await prisma.notification.create({
      data: {
        volunteerId: data.volunteerId,
        type: data.type,
        message: data.message,
        isRead: false,
      },
    });
  }

  /**
   * Get notifications for a volunteer with pagination
   */
  async getNotifications(volunteerId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const unreadOnly = options?.unreadOnly || false;

    const where = {
      volunteerId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { volunteerId, isRead: false },
      }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      unreadCount,
    };
  }

  /**
   * Get unread count for a volunteer
   */
  async getUnreadCount(volunteerId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        volunteerId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, volunteerId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        volunteerId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a volunteer
   */
  async markAllAsRead(volunteerId: string) {
    return await prisma.notification.updateMany({
      where: {
        volunteerId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}

export const notificationService = new NotificationService();
