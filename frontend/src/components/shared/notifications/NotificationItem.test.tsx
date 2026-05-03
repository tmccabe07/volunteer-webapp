/**
 * NotificationItem Component Tests
 * 
 * Tests notification display with icons, read status, and interaction
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from './NotificationItem';
import { type Notification } from '@/services/notifications.service';

describe('NotificationItem', () => {
  const mockNotification: Notification = {
    id: 'notif-123',
    volunteerId: 'volunteer-123',
    type: 'BADGE_ACHIEVEMENT',
    message: 'Congratulations! You earned the Bronze badge!',
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  const mockOnMarkAsRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render notification message', () => {
    render(<NotificationItem notification={mockNotification} />);
    
    expect(screen.getByText('Congratulations! You earned the Bronze badge!')).toBeInTheDocument();
  });

  it('should display correct icon for notification type', () => {
    const { rerender } = render(
      <NotificationItem notification={{ ...mockNotification, type: 'BADGE_ACHIEVEMENT' }} />
    );
    expect(screen.getByText('🏆')).toBeInTheDocument();

    rerender(<NotificationItem notification={{ ...mockNotification, type: 'TASK_COMPLETION' }} />);
    expect(screen.getByText('✅')).toBeInTheDocument();

    rerender(<NotificationItem notification={{ ...mockNotification, type: 'EVENT_REMINDER' }} />);
    expect(screen.getByText('📅')).toBeInTheDocument();

    rerender(<NotificationItem notification={{ ...mockNotification, type: 'POINT_AWARD' }} />);
    expect(screen.getByText('⭐')).toBeInTheDocument();

    rerender(<NotificationItem notification={{ ...mockNotification, type: 'POINT_REVOCATION' }} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should display type label when not compact', () => {
    render(<NotificationItem notification={mockNotification} compact={false} />);
    
    expect(screen.getByText('Badge Achievement')).toBeInTheDocument();
  });

  it('should not display type label when compact', () => {
    render(<NotificationItem notification={mockNotification} compact={true} />);
    
    expect(screen.queryByText('Badge Achievement')).not.toBeInTheDocument();
  });

  it('should show unread indicator for unread notifications', () => {
    const { container } = render(
      <NotificationItem notification={{ ...mockNotification, isRead: false }} />
    );
    
    const unreadDot = container.querySelector('.bg-blue-600');
    expect(unreadDot).toBeInTheDocument();
  });

  it('should not show unread indicator for read notifications', () => {
    const { container } = render(
      <NotificationItem notification={{ ...mockNotification, isRead: true }} />
    );
    
    const unreadDot = container.querySelector('.bg-blue-600');
    expect(unreadDot).not.toBeInTheDocument();
  });

  it('should apply bold text for unread notifications', () => {
    const { container } = render(
      <NotificationItem notification={{ ...mockNotification, isRead: false }} />
    );
    
    const messageElement = screen.getByText('Congratulations! You earned the Bronze badge!');
    expect(messageElement).toHaveClass('font-semibold');
  });

  it('should not apply bold text for read notifications', () => {
    render(<NotificationItem notification={{ ...mockNotification, isRead: true }} />);
    
    const messageElement = screen.getByText('Congratulations! You earned the Bronze badge!');
    expect(messageElement).not.toHaveClass('font-semibold');
  });

  it('should call onMarkAsRead when clicking unread notification', () => {
    render(
      <NotificationItem
        notification={{ ...mockNotification, isRead: false }}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );
    
    const notificationDiv = screen.getByText('Congratulations! You earned the Bronze badge!').closest('div');
    fireEvent.click(notificationDiv!);
    
    expect(mockOnMarkAsRead).toHaveBeenCalledWith(mockNotification.id);
  });

  it('should not call onMarkAsRead when clicking read notification', () => {
    render(
      <NotificationItem
        notification={{ ...mockNotification, isRead: true }}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );
    
    const notificationDiv = screen.getByText('Congratulations! You earned the Bronze badge!').closest('div');
    fireEvent.click(notificationDiv!);
    
    expect(mockOnMarkAsRead).not.toHaveBeenCalled();
  });

  it('should not crash when onMarkAsRead is not provided', () => {
    render(<NotificationItem notification={{ ...mockNotification, isRead: false }} />);
    
    const notificationDiv = screen.getByText('Congratulations! You earned the Bronze badge!').closest('div');
    
    expect(() => {
      fireEvent.click(notificationDiv!);
    }).not.toThrow();
  });

  it('should display relative time correctly', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    render(
      <NotificationItem
        notification={{ ...mockNotification, createdAt: twoHoursAgo.toISOString() }}
      />
    );
    
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('should display "Just now" for very recent notifications', () => {
    const now = new Date();
    
    render(
      <NotificationItem
        notification={{ ...mockNotification, createdAt: now.toISOString() }}
      />
    );
    
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('should apply correct background color for unread notifications', () => {
    const { container } = render(
      <NotificationItem notification={{ ...mockNotification, isRead: false }} />
    );
    
    const notificationDiv = container.firstChild;
    expect(notificationDiv).toHaveClass('bg-blue-50');
  });

  it('should not apply background color for read notifications', () => {
    const { container } = render(
      <NotificationItem notification={{ ...mockNotification, isRead: true }} />
    );
    
    const notificationDiv = container.firstChild;
    expect(notificationDiv).not.toHaveClass('bg-blue-50');
  });
});
