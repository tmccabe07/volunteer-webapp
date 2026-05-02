/**
 * Notifications Page Tests
 * 
 * Tests notifications page with filtering, pagination, and mark-as-read
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NotificationsPage from './page';
import { notificationsApi, type Notification } from '@/services/notifications.service';

// Mock dependencies
vi.mock('@/services/notifications.service');
vi.mock('@/lib/notification-context', () => ({
  useNotifications: () => ({
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refreshNotifications: vi.fn(),
    unreadCount: 2,
  }),
}));

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    volunteerId: 'vol-1',
    type: 'BADGE_ACHIEVEMENT',
    message: 'You earned Bronze badge!',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    volunteerId: 'vol-1',
    type: 'TASK_COMPLETION',
    message: 'Task completed!',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-3',
    volunteerId: 'vol-1',
    type: 'EVENT_REMINDER',
    message: 'Event tomorrow!',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock response
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 3, limit: 20, offset: 0, hasMore: false },
      unreadCount: 2,
    });
  });

  it('should render notifications list', async () => {
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('You earned Bronze badge!')).toBeInTheDocument();
      expect(screen.getByText('Task completed!')).toBeInTheDocument();
      expect(screen.getByText('Event tomorrow!')).toBeInTheDocument();
    });
  });

  it('should display unread count badge', async () => {
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('2 unread')).toBeInTheDocument();
    });
  });

  it('should filter notifications by unread only', async () => {
    const unreadNotifications = mockNotifications.filter(n => !n.isRead);
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: unreadNotifications,
      pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
      unreadCount: 2,
    });

    render(<NotificationsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('You earned Bronze badge!')).toBeInTheDocument();
    });

    // Change filter to unread only
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'unread' } });

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        unreadOnly: true,
      });
    });
  });

  it('should show loading state', () => {
    (notificationsApi.getNotifications as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<NotificationsPage />);

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    (notificationsApi.getNotifications as any).mockRejectedValue(
      new Error('Failed to load')
    );

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load notifications/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no notifications', async () => {
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      unreadCount: 0,
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('should show empty state for unread filter when no unread notifications', async () => {
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      unreadCount: 0,
    });

    render(<NotificationsPage />);

    // Change to unread filter
    await waitFor(() => {
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'unread' } });
    });

    await waitFor(() => {
      expect(screen.getByText('No unread notifications')).toBeInTheDocument();
    });
  });

  it('should mark all as read when button clicked', async () => {
    (notificationsApi.markAllAsRead as any).mockResolvedValue({
      message: 'All marked as read',
      count: 2,
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    const markAllButton = screen.getByText('Mark all as read');
    fireEvent.click(markAllButton);

    await waitFor(() => {
      expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
    });
  });

  it('should not show "Mark all as read" button when no unread notifications', async () => {
    vi.mock('@/lib/notification-context', () => ({
      useNotifications: () => ({
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        refreshNotifications: vi.fn(),
        unreadCount: 0,
      }),
    }));

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    const firstPageNotifications = mockNotifications.slice(0, 2);
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: firstPageNotifications,
      pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
      unreadCount: 2,
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 20 of 25 notifications')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeEnabled();
    });

    // Click next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
        limit: 20,
        offset: 20,
        unreadOnly: false,
      });
    });
  });

  it('should disable Previous button on first page', async () => {
    render(<NotificationsPage />);

    await waitFor(() => {
      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });
  });

  it('should disable Next button on last page', async () => {
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 3, limit: 20, offset: 0, hasMore: false },
      unreadCount: 2,
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  it('should mark individual notification as read when clicked', async () => {
    (notificationsApi.markAsRead as any).mockResolvedValue({
      message: 'Marked as read',
      notification: { ...mockNotifications[0], isRead: true },
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('You earned Bronze badge!')).toBeInTheDocument();
    });

    // Click on the notification
    const notificationElement = screen.getByText('You earned Bronze badge!');
    fireEvent.click(notificationElement.closest('div')!);

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('should reset to page 1 when changing filter', async () => {
    render(<NotificationsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('You earned Bronze badge!')).toBeInTheDocument();
    });

    // Navigate to page 2 (if pagination exists)
    // Then change filter
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'unread' } });

    await waitFor(() => {
      // Should call API with offset 0 (page 1)
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        unreadOnly: true,
      });
    });
  });
});
