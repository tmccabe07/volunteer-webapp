/**
 * NotificationItem Component
 * 
 * Displays a single notification with type icon, message, and read status
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { type Notification } from '@/services/notifications.service';
import { Badge } from '@/components/ui/badge';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (notificationId: string) => void;
  compact?: boolean;
}

// Icon mapping for notification types
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'BADGE_ACHIEVEMENT':
      return '🏆'; // Trophy
    case 'TASK_COMPLETION':
      return '✅'; // Check mark
    case 'TASK_ASSIGNED':
      return '📋'; // Clipboard
    case 'EVENT_REMINDER':
      return '📅'; // Calendar
    case 'NEW_EVENT':
      return '🎉'; // Party
    case 'POINT_AWARD':
      return '⭐'; // Star
    case 'POINT_REVOCATION':
      return '⚠️'; // Warning
    default:
      return '🔔'; // Bell
  }
};

// Display name mapping for notification types
const getNotificationTypeLabel = (type: string) => {
  switch (type) {
    case 'BADGE_ACHIEVEMENT':
      return 'Badge Achievement';
    case 'TASK_COMPLETION':
      return 'Task Complete';
    case 'TASK_ASSIGNED':
      return 'Task Assigned';
    case 'EVENT_REMINDER':
      return 'Event Reminder';
    case 'NEW_EVENT':
      return 'New Event';
    case 'POINT_AWARD':
      return 'Points Awarded';
    case 'POINT_REVOCATION':
      return 'Points Revoked';
    default:
      return 'Notification';
  }
};

// Format relative time (e.g., "2 hours ago")
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  compact = false 
}: NotificationItemProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    // Navigate to the link if it exists
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const isClickable = Boolean(notification.link);

  return (
    <div
      className={`flex gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isClickable ? 'cursor-pointer' : ''
      } ${!notification.isRead ? 'bg-blue-50' : ''}`}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Icon */}
      <div className="text-2xl flex-shrink-0">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {!compact && (
              <Badge variant="outline" className="mb-1 text-xs">
                {getNotificationTypeLabel(notification.type)}
              </Badge>
            )}
            <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
              {notification.message}
            </p>
            {notification.link && (
              <p className="text-xs text-blue-600 mt-1">
                Click to view →
              </p>
            )}
          </div>
          {!notification.isRead && (
            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" title="Unread" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}
