/**
 * NotificationContext Tests
 * 
 * Tests notification state management and polling functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './notification-context';
import { notificationsApi, type Notification } from '@/services/notifications.service';

// Mock services
vi.mock('@/services/notifications.service');
vi.mock('./auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

// Test component that uses the context
function TestComponent() {
  const { notifications, unreadCount, isLoading, refreshNotifications, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="notification-count">{notifications.length}</div>
      <button onClick={refreshNotifications}>Refresh</button>
      <button onClick={() => markAsRead('notif-1')}>Mark One</button>
      <button onClick={markAllAsRead}>Mark All</button>
    </div>
  );
}

describe('NotificationContext', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      volunteerId: 'vol-1',
      type: 'BADGE_ACHIEVEMENT',
      message: 'You earned Bronze!',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      volunteerId: 'vol-1',
      type: 'TASK_COMPLETION',
      message: 'Task completed!',
      isRead: true,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock default response
    (notificationsApi.getNotifications as any).mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
      unreadCount: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should provide initial notification state', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });
  });

  it('should load notifications on mount when authenticated', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
      });
    });
  });

  it('should refresh notifications when refreshNotifications is called', async () => {
    const { getByText } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });

    vi.clearAllMocks();

    // Refresh
    act(() => {
      getByText('Refresh').click();
    });

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
    });
  });

  it('should mark notification as read and update state', async () => {
    (notificationsApi.markAsRead as any).mockResolvedValue({
      message: 'Marked as read',
      notification: { ...mockNotifications[0], isRead: true },
    });

    const { getByText } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    // Mark as read
    act(() => {
      getByText('Mark One').click();
    });

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('notif-1');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });

  it('should mark all notifications as read and update state', async () => {
    (notificationsApi.markAllAsRead as any).mockResolvedValue({
      message: 'All marked as read',
      count: 1,
    });

    const { getByText } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    // Mark all as read
    act(() => {
      getByText('Mark All').click();
    });

    await waitFor(() => {
      expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });

  it('should poll for notifications every 30 seconds', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
    });

    vi.clearAllMocks();

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
    });

    // Fast-forward another 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    });
  });

  it('should clear notifications when not authenticated', () => {
    // Mock unauthenticated state
    vi.mock('./auth-context', () => ({
      useAuth: () => ({ isAuthenticated: false }),
    }));

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
  });

  it('should handle API errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (notificationsApi.getNotifications as any).mockRejectedValue(new Error('Network error'));

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load notifications:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('should throw error when useNotifications is used outside provider', () => {
    // Mock console.error to suppress error output in test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');

    consoleError.mockRestore();
  });

  it('should not clear existing notifications on API error', async () => {
    // Initial successful load
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });

    // Simulate API error on refresh
    (notificationsApi.getNotifications as any).mockRejectedValueOnce(new Error('Network error'));

    act(() => {
      screen.getByText('Refresh').click();
    });

    await waitFor(() => {
      // Notifications should still be present
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });
  });
});
