import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './page';

// Mock Next.js navigation
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth context with require auth
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  authTier: 'VOLUNTEER',
  pointBalance: {
    currentYearPoints: 150,
    totalPoints: 425,
  },
};

const mockUseRequireAuth = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useRequireAuth: () => mockUseRequireAuth(),
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

// Mock events service
const mockListEvents = vi.fn();
vi.mock('@/services/events.service', () => ({
  default: {
    listEvents: (...args: any[]) => mockListEvents(...args),
  },
}));

describe('DashboardPage', () => {
  const mockUpcomingEvents = [
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
      location: null,
      rankLevel: null,
    },
  ];

  beforeEach(() => {
    mockUseRequireAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    mockListEvents.mockResolvedValue({
      events: mockUpcomingEvents,
      pagination: { page: 1, limit: 5, total: 3, totalPages: 1 },
    });
    mockPush.mockClear();
  });

  afterEach(() => {
    mockListEvents.mockClear();
    cleanup();
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth is loading', () => {
      mockUseRequireAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      render(<DashboardPage />);

      expect(screen.getByText(/loading.../i)).toBeInTheDocument();
    });

    it('should show spinner with proper styling', () => {
      mockUseRequireAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      const { container } = render(<DashboardPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render dashboard content while loading', () => {
      mockUseRequireAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      render(<DashboardPage />);

      expect(screen.queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument();
    });
  });

  describe('Initial Rendering', () => {
    it('should render dashboard heading', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
    });

    it('should display welcome message with user name', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back, john doe!/i)).toBeInTheDocument();
      });
    });

    it('should render all three main cards', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /your profile/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /your points/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /quick actions/i })).toBeInTheDocument();
      });
    });

    it('should render upcoming events section', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /upcoming events/i })).toBeInTheDocument();
      });
    });

    it('should render recent activity section', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /recent activity/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Profile Card', () => {
    it('should display user name', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/name:/i)).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should display user email', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/email:/i)).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should display user phone when available', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/phone:/i)).toBeInTheDocument();
        expect(screen.getByText('555-1234')).toBeInTheDocument();
      });
    });

    it('should not display phone field when not provided', async () => {
      const userWithoutPhone = { ...mockUser, phone: undefined };
      mockUseRequireAuth.mockReturnValue({
        user: userWithoutPhone,
        isLoading: false,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText(/phone:/i)).not.toBeInTheDocument();
      });
    });

    it('should display user auth tier', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/role:/i)).toBeInTheDocument();
        expect(screen.getByText('VOLUNTEER')).toBeInTheDocument();
      });
    });

    it('should style auth tier as badge', async () => {
      const { container } = render(<DashboardPage />);

      await waitFor(() => {
        const badge = container.querySelector('.bg-blue-100');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('VOLUNTEER');
      });
    });
  });

  describe('Points Card', () => {
    it('should display current year points', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText(/points this year/i)).toBeInTheDocument();
      });
    });

    it('should display total points', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('425')).toBeInTheDocument();
        expect(screen.getByText(/total points/i)).toBeInTheDocument();
      });
    });

    it('should display zero when point balance is missing', async () => {
      const userWithoutPoints = { ...mockUser, pointBalance: undefined };
      mockUseRequireAuth.mockReturnValue({
        user: userWithoutPoints,
        isLoading: false,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display zero for missing currentYearPoints', async () => {
      const userWithPartialPoints = {
        ...mockUser,
        pointBalance: { currentYearPoints: 0, totalPoints: 100 },
      };
      mockUseRequireAuth.mockReturnValue({
        user: userWithPartialPoints,
        isLoading: false,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions Card', () => {
    it('should render all quick action buttons', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view events/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /my tasks/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
      });
    });

    it('should link to events page', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole('button', { name: /view events/i }).closest('a');
        expect(link).toHaveAttribute('href', '/events');
      });
    });

    it('should link to tasks page', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole('button', { name: /my tasks/i }).closest('a');
        expect(link).toHaveAttribute('href', '/tasks');
      });
    });

    it('should link to leaderboard page', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole('button', { name: /leaderboard/i }).closest('a');
        expect(link).toHaveAttribute('href', '/leaderboard');
      });
    });
  });

  describe('Upcoming Events Section', () => {
    it('should load upcoming events on mount', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({
          upcoming: true,
          limit: 5,
        });
      });
    });

    it('should show loading state while events load', () => {
      mockListEvents.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DashboardPage />);

      expect(screen.getByText(/loading events.../i)).toBeInTheDocument();
    });

    it('should display upcoming events after loading', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/pack meeting cleanup/i)).toBeInTheDocument();
        expect(screen.getByText(/den meeting setup/i)).toBeInTheDocument();
        expect(screen.getByText(/camping preparation/i)).toBeInTheDocument();
      });
    });

    it('should display event dates in formatted form', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // Check for formatted date strings (e.g., "Wed, May 15, 2026")
        expect(screen.getByText(/may 15/i)).toBeInTheDocument();
        expect(screen.getByText(/may 20/i)).toBeInTheDocument();
      });
    });

    it('should display event locations when available', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/church hall/i)).toBeInTheDocument();
        expect(screen.getByText(/community center/i)).toBeInTheDocument();
      });
    });

    it('should not display location bullet when location is null', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const campingEvent = screen.getByText(/camping preparation/i).closest('div');
        expect(campingEvent?.textContent).not.toContain('•');
      });
    });

    it('should display rank level when available', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('PACK_WIDE')).toBeInTheDocument();
        expect(screen.getByText('WOLF')).toBeInTheDocument();
      });
    });

    it('should link each event to its detail page', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const eventLinks = screen.getAllByRole('link');
        const eventDetailLinks = eventLinks.filter(link => 
          link.getAttribute('href')?.startsWith('/events/event-')
        );
        expect(eventDetailLinks.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should show empty state when no events', async () => {
      mockListEvents.mockResolvedValueOnce({
        events: [],
        pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no upcoming events scheduled/i)).toBeInTheDocument();
      });
    });

    it('should link to full events page', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const viewAllButton = screen.getByRole('button', { name: /view all/i });
        const link = viewAllButton.closest('a');
        expect(link).toHaveAttribute('href', '/events');
      });
    });

    it('should handle events loading error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockListEvents.mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        // Should show empty state, not crash
        expect(screen.getByText(/no upcoming events scheduled/i)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Recent Activity Section', () => {
    it('should show placeholder message', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication', () => {
    it('should not render content when user is null after loading', () => {
      mockUseRequireAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<DashboardPage />);

      expect(screen.queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument();
    });

    it('should load events only when user is authenticated', async () => {
      mockUseRequireAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<DashboardPage />);

      expect(mockListEvents).not.toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates consistently', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        // Should include weekday, month, day, and year
        const dateElements = screen.getAllByText(/2026/i);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { name: /dashboard/i, level: 1 });
        expect(h1).toBeInTheDocument();

        const h2Headings = screen.getAllByRole('heading', { level: 2 });
        expect(h2Headings.length).toBeGreaterThanOrEqual(4); // Profile, Points, Quick Actions, Upcoming Events, Recent Activity
      });
    });

    it('should have accessible links', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });
      });
    });

    it('should have accessible buttons', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button.textContent).toBeTruthy();
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render grid layout classes', async () => {
      const { container } = render(<DashboardPage />);

      await waitFor(() => {
        const grids = container.querySelectorAll('[class*="grid"]');
        expect(grids.length).toBeGreaterThan(0);
      });
    });
  });
});
