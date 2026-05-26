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
    link?: string;
  }) {
    return await prisma.notification.create({
      data: {
        volunteerId: data.volunteerId,
        type: data.type,
        message: data.message,
        link: data.link,
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

  /**
   * Send notification when child attendance is recorded
   * Notifies parents with approved links to the child
   */
  async notifyChildAttendance(data: {
    childId: string;
    childName: string;
    eventTitle: string;
    eventId: string;
    recordedBy: string;
  }) {
    // Find all parents with approved links to this child
    const parentLinks = await prisma.parentChildLink.findMany({
      where: {
        childScoutId: data.childId,
        status: 'APPROVED'
      },
      include: {
        parent: true
      }
    });

    // Send notification to each parent
    for (const link of parentLinks) {
      await this.createNotification({
        volunteerId: link.parentId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: `Attendance recorded for ${data.childName} at ${data.eventTitle}`,
        link: `/children/${data.childId}/attendance`
      });
    }

    return { notified: parentLinks.length };
  }

  /**
   * Send notification when requirement progress is updated
   * Notifies parents with approved links to the child
   */
  async notifyRequirementProgress(data: {
    childId: string;
    childName: string;
    requirementText: string;
    adventureName: string;
    completed: boolean;
    completedBy: string;
  }) {
    // Find all parents with approved links to this child
    const parentLinks = await prisma.parentChildLink.findMany({
      where: {
        childScoutId: data.childId,
        status: 'APPROVED'
      },
      include: {
        parent: true
      }
    });

    const action = data.completed ? 'completed' : 'updated';
    const message = `${data.childName} ${action} requirement: ${data.requirementText} (${data.adventureName})`;

    // Send notification to each parent
    for (const link of parentLinks) {
      await this.createNotification({
        volunteerId: link.parentId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: message,
        link: `/children/${data.childId}/advancement`
      });
    }

    return { notified: parentLinks.length };
  }

  /**
   * Send notification when adventure is completed
   * Notifies parents with approved links to the child
   */
  async notifyAdventureComplete(data: {
    childId: string;
    childName: string;
    adventureName: string;
    rankLevel: string;
    completedBy: string;
  }) {
    // Find all parents with approved links to this child
    const parentLinks = await prisma.parentChildLink.findMany({
      where: {
        childScoutId: data.childId,
        status: 'APPROVED'
      },
      include: {
        parent: true
      }
    });

    const message = `${data.childName} completed ${data.adventureName} adventure (${data.rankLevel})!`;

    // Send notification to each parent
    for (const link of parentLinks) {
      await this.createNotification({
        volunteerId: link.parentId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: message,
        link: `/children/${data.childId}/advancement`
      });
    }

    return { notified: parentLinks.length };
  }

  /**
   * Send notification when award eligibility is achieved
   * Notifies parents and den leaders
   */
  async notifyAwardEligible(data: {
    childId: string;
    childName: string;
    awardType: string;
    rankLevel: string;
    denNumber: number;
  }) {
    const notified: string[] = [];

    // Notify parents
    const parentLinks = await prisma.parentChildLink.findMany({
      where: {
        childScoutId: data.childId,
        status: 'APPROVED'
      }
    });

    for (const link of parentLinks) {
      await this.createNotification({
        volunteerId: link.parentId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: `${data.childName} is eligible for ${data.awardType}!`,
        link: `/children/${data.childId}/awards`
      });
      notified.push(link.parentId);
    }

    // Notify den leaders
    const denLeaders = await prisma.volunteerToRole.findMany({
      where: {
        denNumber: data.denNumber,
        removedAt: null,
        role: {
          roleType: 'DEN_LEADER'
        }
      }
    });

    for (const assignment of denLeaders) {
      await this.createNotification({
        volunteerId: assignment.volunteerId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: `${data.childName} (Den ${data.denNumber}) is eligible for ${data.awardType}`,
        link: `/children/${data.childId}/awards`
      });
      notified.push(assignment.volunteerId);
    }

    return { notified: notified.length };
  }

  /**
   * Send notification when award state changes
   * Notifies parents for major milestones
   */
  async notifyAwardStateChange(data: {
    childId: string;
    childName: string;
    awardType: string;
    newState: string;
    transitionedBy: string;
  }) {
    // Only notify parents for significant state changes
    const notifyStates = ['APPROVED', 'DISTRIBUTED', 'RECONCILED'];

    if (!notifyStates.includes(data.newState)) {
      return { notified: 0 };
    }

    // Find all parents with approved links to this child
    const parentLinks = await prisma.parentChildLink.findMany({
      where: {
        childScoutId: data.childId,
        status: 'APPROVED'
      }
    });

    const stateMessages = {
      APPROVED: `${data.childName}'s ${data.awardType} has been approved!`,
      DISTRIBUTED: `${data.childName} received their ${data.awardType}!`,
      RECONCILED: `${data.childName}'s ${data.awardType} has been recorded in Scoutbook`
    };

    const message = stateMessages[data.newState as keyof typeof stateMessages];

    // Send notification to each parent
    for (const link of parentLinks) {
      await this.createNotification({
        volunteerId: link.parentId,
        type: NotificationType.BADGE_ACHIEVEMENT,
        message: message,
        link: `/children/${data.childId}/awards`
      });
    }

    return { notified: parentLinks.length };
  }

  /**
   * Send notification for den event post-meeting prompt
   * Notifies den leaders to complete attendance and requirements
   */
  async notifyDenEventPostMeeting(data: {
    eventId: string;
    eventTitle: string;
    denNumber: number;
    eventDate: Date;
  }) {
    // Find all den leaders for this den
    const denLeaders = await prisma.volunteerToRole.findMany({
      where: {
        denNumber: data.denNumber,
        removedAt: null,
        role: {
          roleType: 'DEN_LEADER'
        }
      }
    });

    for (const assignment of denLeaders) {
      await this.createNotification({
        volunteerId: assignment.volunteerId,
        type: NotificationType.EVENT_REMINDER,
        message: `Please complete attendance and requirements for: ${data.eventTitle}`,
        link: `/dens/${data.denNumber}/events/${data.eventId}`
      });
    }

    return { notified: denLeaders.length };
  }
}

export const notificationService = new NotificationService();
