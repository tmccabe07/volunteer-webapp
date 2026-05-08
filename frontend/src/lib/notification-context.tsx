/**
 * NotificationContext
 * 
 * Provides notification state management and polling functionality
 * Automatically polls for new notifications every 30 seconds
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi, type Notification } from '@/services/notifications.service';
import { useAuth } from './auth-context';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      startPolling();
    } else {
      stopPolling();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      stopPolling();
    };
  }, [isAuthenticated]);

  /**
   * Load notifications from API
   */
  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await notificationsApi.getNotifications({
        limit: 20,
        offset: 0,
      });
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      // Don't clear existing notifications on error - gracefully degrade
      // Set counts to 0 to avoid showing stale data
      if (error.response?.status === 400) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh notifications (public method)
   */
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, []);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }, []);

  /**
   * Start polling for new notifications
   */
  const startPolling = () => {
    // Clear any existing interval
    stopPolling();

    // Set up new polling interval
    pollingIntervalRef.current = setInterval(() => {
      loadNotifications();
    }, POLL_INTERVAL);
  };

  /**
   * Stop polling for notifications
   */
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
