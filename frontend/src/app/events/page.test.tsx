import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventsPage from './page';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock auth context with dynamic user
let mockAuthUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  authTier: 'VOLUNTEER',
  pointBalance: {
    currentYearPoints: 10,
    totalPoints: 25,
  },
};

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
  }),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock Select component
vi.mock('@/components/ui/select', () => {
  const React = require('react');
  
  const SELECT_ITEM_TYPE = Symbol.for('SelectItem');
  
  const SelectItem = ({ children, value }: any) => {
    (SelectItem as any).$$typeof = SELECT_ITEM_TYPE;
    return null;
  };
  (SelectItem as any).$$itemType = SELECT_ITEM_TYPE;
  
  const Select = ({ children, value, onValueChange }: any) => {
    const options: Array<{ value: string; label: string }> = [];
    
    const extractItems = (node: any): void => {
      React.Children.forEach(node, (child: any) => {
        if (!child) return;
        
        const childType = child.type;
        if (childType && (
          childType.name === 'SelectItem' ||
          childType.$$itemType === SELECT_ITEM_TYPE ||
          String(childType).includes('SelectItem')
        )) {
          options.push({
            value: child.props.value,
            label: child.props.children
          });
        } else if (child.props?.children) {
          extractItems(child.props.children);
        }
      });
    };
    
    extractItems(children);
    
    return React.createElement('select', {
      'data-testid': 'select-native',
      'aria-label': 'rank-level-select',
      value: value || '',
      onChange: (e: any) => onValueChange?.(e.target.value)
    }, [
      value === '' && React.createElement('option', { key: '__empty__', value: '' }, 'Select...'),
      ...options.map(opt => 
        React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
      )
    ].filter(Boolean));
  };
  
  return {
    Select,
    SelectTrigger: ({ children }: any) => children,
    SelectValue: ({ placeholder }: any) => React.createElement('span', {}, placeholder),
    SelectContent: ({ children }: any) => children,
    SelectItem,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  PlusCircle: () => <span data-testid="plus-icon">+</span>,
}));

// Mock EventCard component
vi.mock('@/components/shared/events/EventCard', () => ({
  default: ({ event }: any) => (
    <div data-testid="event-card" data-event-id={event.id}>
      <h3>{event.title}</h3>
      <p>{event.location}</p>
    </div>
  ),
}));

// Mock events service
const mockListEvents = vi.fn();
vi.mock('@/services/events.service', () => ({
  default: {
    listEvents: (...args: any[]) => mockListEvents(...args),
  },
}));

describe('EventsPage', () => {
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Pack Meeting Cleanup',
      eventDate: '2026-05-15T18:00:00Z',
      location: 'Church Hall',
      rankLevel: 'PACK_WIDE',
    },
    {
      id: 'event-2',
      title: 'Den Meeting Setup',
      eventDate: '2026-05-20T17:00:00Z',
      location: 'Community Center',
      rankLevel: 'WOLF',
    },
    {
      id: 'event-3',
      title: 'Camping Preparation',
      eventDate: '2026-06-01T14:00:00Z',
      location: 'Camp Grounds',
      rankLevel: null,
    },
  ];

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  };

  beforeEach(() => {
    mockListEvents.mockResolvedValue({
      events: mockEvents,
      pagination: mockPagination,
    });
    mockPush.mockClear();
  });

  afterEach(() => {
    mockListEvents.mockClear();
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('should render the page heading', async () => {
      render(<EventsPage />);

      expect(screen.getByRole('heading', { name: /volunteer events/i })).toBeInTheDocument();
      expect(screen.getByText(/sign up for events to help your pack and earn points/i)).toBeInTheDocument();
    });

    it('should render filters section', async () => {
      render(<EventsPage />);

      expect(screen.getByText(/rank level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/upcoming events only/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/my signups/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    });

    it('should not show create event button for volunteers', async () => {
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /create event/i })).not.toBeInTheDocument();
      });
    });

    it('should render all rank level options', async () => {
      render(<EventsPage />);

      const select = screen.getByLabelText('rank-level-select');
      
      expect(screen.getByRole('option', { name: /all ranks/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^lion$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^tiger$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^wolf$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^bear$/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /webelos/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /arrow of light/i })).toBeInTheDocument();
    });

    it('should have upcoming events checked by default', async () => {
      render(<EventsPage />);

      const checkbox = screen.getByLabelText(/upcoming events only/i);
      expect(checkbox).toBeChecked();
    });

    it('should have my signups unchecked by default', async () => {
      render(<EventsPage />);

      const checkbox = screen.getByLabelText(/my signups/i);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Leader/Admin Features', () => {
    it('should show create event button for leaders', async () => {
      mockAuthUser.authTier = 'LEADER';

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
      });
      
      // Reset for other tests
      mockAuthUser.authTier = 'VOLUNTEER';
    });

    it('should show create event button for admins', async () => {
      mockAuthUser.authTier = 'ADMIN';

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
      });
      
      // Reset for other tests
      mockAuthUser.authTier = 'VOLUNTEER';
    });

    it('should link to create event page', async () => {
      mockAuthUser.authTier = 'LEADER';

      render(<EventsPage />);

      await waitFor(() => {
        const link = screen.getByRole('button', { name: /create event/i }).closest('a');
        expect(link).toHaveAttribute('href', '/events/create');
      });
      
      // Reset for other tests
      mockAuthUser.authTier = 'VOLUNTEER';
    });
  });

  describe('Loading Events', () => {
    it('should show loading state initially', () => {
      render(<EventsPage />);

      expect(screen.getByText(/loading events.../i)).toBeInTheDocument();
    });

    it('should load events on mount', async () => {
      render(<EventsPage />);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          upcoming: true,
          mySignups: false,
        });
      });
    });

    it('should display events after loading', async () => {
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
        expect(screen.getByText(/den meeting setup/i)).toBeInTheDocument();
        expect(screen.getByText(/camping preparation/i)).toBeInTheDocument();
      });
    });

    it('should render EventCard for each event', async () => {
      render(<EventsPage />);

      await waitFor(() => {
        const eventCards = screen.getAllByTestId('event-card');
        expect(eventCards).toHaveLength(3);
      });
    });

    it('should hide loading state after events load', async () => {
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading events.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when loading fails', async () => {
      mockListEvents.mockRejectedValueOnce(new Error('Network error'));

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display generic error when no message provided', async () => {
      mockListEvents.mockRejectedValueOnce(new Error());

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load events/i)).toBeInTheDocument();
      });
    });

    it('should not show events when error occurs', async () => {
      mockListEvents.mockRejectedValueOnce(new Error('Server error'));

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('event-card')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no events found', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: [],
        pagination: { ...mockPagination, total: 0 },
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no events found/i)).toBeInTheDocument();
        expect(screen.getByText(/try adjusting your filters or check back later/i)).toBeInTheDocument();
      });
    });

    it('should not show pagination when no events', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: [],
        pagination: { ...mockPagination, total: 0, totalPages: 0 },
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Filter Interactions', () => {
    it('should update rank level filter', async () => {
      const user = userEvent.setup();
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText('rank-level-select');
      await user.selectOptions(select, 'WOLF');

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          upcoming: true,
          mySignups: false,
          rankLevel: 'WOLF',
        });
      });
    });

    it('should not send rankLevel param when ALL is selected', async () => {
      const user = userEvent.setup();
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
      });

      // Select a specific rank first
      const select = screen.getByLabelText('rank-level-select');
      await user.selectOptions(select, 'WOLF');

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenLastCalledWith(
          expect.objectContaining({ rankLevel: 'WOLF' })
        );
      });

      // Switch back to ALL
      await user.selectOptions(select, 'ALL');

      await waitFor(() => {
        const lastCall = mockListEvents.mock.calls[mockListEvents.mock.calls.length - 1][0];
        expect(lastCall.rankLevel).toBeUndefined();
      });
    });

    it('should toggle upcoming events filter', async () => {
      const user = userEvent.setup();
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText(/upcoming events only/i);
      await user.click(checkbox);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          upcoming: false,
          mySignups: false,
        });
      });
    });

    it('should toggle my signups filter', async () => {
      const user = userEvent.setup();
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText(/my signups/i);
      await user.click(checkbox);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          upcoming: true,
          mySignups: true,
        });
      });
    });

    it('should reload events when apply filters button is clicked', async () => {
      const user = userEvent.setup();
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
      });

      const initialCallCount = mockListEvents.mock.calls.length;

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockListEvents.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should combine multiple filters', async () => {
      const user = userEvent.setup();
      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
      });

      // Set rank level
      const select = screen.getByLabelText('rank-level-select');
      await user.selectOptions(select, 'TIGER');

      // Uncheck upcoming
      const upcomingCheckbox = screen.getByLabelText(/upcoming events only/i);
      await user.click(upcomingCheckbox);

      // Check my signups
      const mySignupsCheckbox = screen.getByLabelText(/my signups/i);
      await user.click(mySignupsCheckbox);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          upcoming: false,
          mySignups: true,
          rankLevel: 'TIGER',
        });
      });
    });
  });

  describe('Pagination', () => {
    const multiPagePagination = {
      page: 1,
      limit: 20,
      total: 50,
      totalPages: 3,
    };

    it('should show pagination when multiple pages exist', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: multiPagePagination,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: multiPagePagination,
      });

      render(<EventsPage />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should enable next button when not on last page', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: multiPagePagination,
      });

      render(<EventsPage />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('should load next page when next button clicked', async () => {
      const user = userEvent.setup();
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: multiPagePagination,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          page: 2,
          limit: 20,
          upcoming: true,
          mySignups: false,
        });
      });
    });

    it('should load previous page when previous button clicked', async () => {
      const user = userEvent.setup();
      
      // Initial load on page 1 with multi-page pagination
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: multiPagePagination,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      // Mock response for page 2
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: { ...multiPagePagination, page: 2 },
      });

      // Go to page 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
      });

      // Mock response for page 1
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: { ...multiPagePagination, page: 1 },
      });

      // Go back to page 1
      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenLastCalledWith({
          page: 1,
          limit: 20,
          upcoming: true,
          mySignups: false,
        });
      });
    });

    it('should disable next button on last page', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: { ...multiPagePagination, page: 3 },
      });

      render(<EventsPage />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it('should hide pagination for single page', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: mockPagination,
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<EventsPage />);

      const heading = screen.getByRole('heading', { name: /volunteer events/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible checkboxes', async () => {
      render(<EventsPage />);

      const upcomingCheckbox = screen.getByLabelText(/upcoming events only/i);
      const mySignupsCheckbox = screen.getByLabelText(/my signups/i);

      expect(upcomingCheckbox).toHaveAttribute('type', 'checkbox');
      expect(mySignupsCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('should have accessible buttons', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: mockEvents,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
        },
      });

      render(<EventsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });
  });
});
