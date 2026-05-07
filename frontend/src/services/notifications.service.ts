import axios from '@/lib/axios';

export type NotificationType = 
  | 'BADGE_ACHIEVEMENT'
  | 'TASK_COMPLETION'
  | 'TASK_ASSIGNED'
  | 'EVENT_REMINDER'
  | 'NEW_EVENT'
  | 'POINT_AWARD'
  | 'POINT_REVOCATION';

export interface Notification {
  id: string;
  volunteerId: string;
  type: NotificationType;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

/**
 * Notifications API service for notification operations
 */
export class NotificationsApiService {
  /**
   * Get notifications for the current user
   */
  async getNotifications(options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    
    if (options?.limit !== undefined) {
      params.set('limit', options.limit.toString());
    }
    if (options?.offset !== undefined) {
      params.set('offset', options.offset.toString());
    }
    if (options?.unreadOnly !== undefined) {
      params.set('unreadOnly', options.unreadOnly.toString());
    }

    const response = await axios.get<NotificationsResponse>(
      `/notifications${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<{ message: string; notification: Notification }> {
    const response = await axios.put<{ message: string; notification: Notification }>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    const response = await axios.put<{ message: string; count: number }>(
      '/notifications/read-all'
    );
    return response.data;
  }
}

export const notificationsApi = new NotificationsApiService();
