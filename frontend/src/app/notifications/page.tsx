/**
 * Notifications Page
 * 
 * Display all notifications with filters and mark-as-read functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { notificationsApi, type Notification, type NotificationType } from '@/services/notifications.service';
import { NotificationItem } from '@/components/shared/notifications/NotificationItem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NotificationsPage() {
  const { markAsRead, markAllAsRead, refreshNotifications, unreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;

  const fetchNotifications = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await notificationsApi.getNotifications({
        limit,
        offset: (pageNum - 1) * limit,
        unreadOnly: filter === 'unread',
      });
      setNotifications(response.notifications);
      setTotalCount(response.pagination.total);
      setHasMore(response.pagination.hasMore);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
    setPage(1);
  }, [filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      refreshNotifications(); // Refresh header badge
    } catch (err: any) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      refreshNotifications(); // Refresh header badge
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchNotifications(newPage);
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-6 px-2">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Filter */}
            <Select value={filter} onValueChange={(value: 'all' | 'unread') => setFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {/* Notifications List */}
        <Card className="overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500 text-sm">
                {filter === 'unread'
                  ? 'All caught up! Check back later for updates.'
                  : 'You\'ll see notifications here when you earn badges, complete tasks, or have upcoming events.'}
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalCount > limit && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} notifications
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasMore || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
