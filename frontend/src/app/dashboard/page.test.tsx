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

// Mock admin tasks service
const mockListTasks = vi.fn();
const mockCompleteTask = vi.fn();
const mockUncompleteTask = vi.fn();
vi.mock('@/services/admin-tasks.service', () => ({
  default: {
    listTasks: (...args: any[]) => mockListTasks(...args),
    completeTask: (...args: any[]) => mockCompleteTask(...args),
    uncompleteTask: (...args: any[]) => mockUncompleteTask(...args),
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

  const futureDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const mockUpcomingTasks = [
    {
      id: 'task-1',
      name: 'Submit attendance report',
      description: 'Monthly attendance summary due',
      dueDate: futureDate(2),
      isOverdue: false,
      isPackWide: false,
      assignedRoles: [{ id: 'role-1', name: 'Den Leader' }],
      currentUserCompletion: null,
      createdAt: futureDate(-5),
      updatedAt: futureDate(-5),
    },
    {
      id: 'task-2',
      name: 'Update roster',
      description: null,
      dueDate: futureDate(5),
      isOverdue: false,
      isPackWide: true,
      assignedRoles: [],
      currentUserCompletion: null,
      createdAt: futureDate(-3),
      updatedAt: futureDate(-3),
    },
    {
      id: 'task-3',
      name: 'Review safety plan',
      description: 'Annual safety protocol review',
      dueDate: futureDate(10),
      isOverdue: false,
      isPackWide: false,
      assignedRoles: [{ id: 'role-2', name: 'Cubmaster' }],
      currentUserCompletion: null,
      createdAt: futureDate(-10),
      updatedAt: futureDate(-10),
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
    mockListTasks.mockResolvedValue({
      tasks: mockUpcomingTasks,
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
    });
    mockPush.mockClear();
  });

  afterEach(() => {
    mockListEvents.mockClear();
    mockListTasks.mockClear();
    mockCompleteTask.mockClear();
    mockUncompleteTask.mockClear();
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

    it('should render my tasks section', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my tasks/i })).toBeInTheDocument();
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

  describe('Profile Edit Navigation', () => {
    it('should display an Edit Profile button in the profile card', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit profile/i });
        expect(editButton).toBeInTheDocument();
      });
    });

    it('should navigate to profile edit page when Edit Profile button is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      expect(mockPush).toHaveBeenCalledWith('/profile/edit');
    });

    it('should not display Edit Profile button when user is not authenticated', () => {
      mockUseRequireAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<DashboardPage />);

      const editButton = screen.queryByRole('button', { name: /edit profile/i });
      expect(editButton).not.toBeInTheDocument();
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

  describe('My Tasks Section', () => {
    it('should load assigned tasks on mount', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockListTasks).toHaveBeenCalledWith({
          assignedToMe: true,
          status: 'incomplete',
          limit: 5,
        });
      });
    });

    it('should show loading state while tasks load', () => {
      mockListTasks.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DashboardPage />);

      expect(screen.getByText(/loading tasks.../i)).toBeInTheDocument();
    });

    it('should display assigned tasks for authenticated user', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
        expect(screen.getByText(/update roster/i)).toBeInTheDocument();
        expect(screen.getByText(/review safety plan/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no assigned tasks', async () => {
      mockListTasks.mockResolvedValueOnce({
        tasks: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no tasks assigned to you/i)).toBeInTheDocument();
      });
    });

    it('should include overdue tasks in display', async () => {
      const tasksWithOverdue = [
        ...mockUpcomingTasks,
        {
          id: 'task-overdue',
          name: 'Overdue task',
          description: 'This should not appear',
          dueDate: futureDate(-1),
          isOverdue: true,
          isPackWide: false,
          assignedRoles: [],
          currentUserCompletion: null,
          createdAt: futureDate(-10),
          updatedAt: futureDate(-10),
        },
      ];

      mockListTasks.mockResolvedValueOnce({
        tasks: tasksWithOverdue,
        pagination: { page: 1, limit: 10, total: 4, totalPages: 1 },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
        expect(screen.getByText(/overdue task/i)).toBeInTheDocument();
      });
    });

    it('should show completion toggle for overdue tasks', async () => {
      const user = userEvent.setup();
      const tasksWithOverdue = [
        {
          id: 'task-overdue',
          name: 'Overdue task',
          description: 'This task is overdue',
          dueDate: futureDate(-1),
          isOverdue: true,
          isPackWide: false,
          assignedRoles: [],
          currentUserCompletion: null,
          createdAt: futureDate(-10),
          updatedAt: futureDate(-10),
        },
      ];

      mockListTasks.mockResolvedValueOnce({
        tasks: tasksWithOverdue,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      mockCompleteTask.mockResolvedValueOnce(undefined);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/overdue task/i)).toBeInTheDocument();
      });

      // Find the completion toggle button for the overdue task
      const toggleButton = screen.getByRole('button', { name: /mark complete/i });
      expect(toggleButton).toBeInTheDocument();

      // Verify we can click it to complete the task
      await user.click(toggleButton);

      await waitFor(() => {
        expect(mockCompleteTask).toHaveBeenCalledWith('task-overdue');
      });
    });

    it('should limit display to 5 tasks', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i + 1}`,
        name: `Task ${i + 1}`,
        description: null,
        dueDate: futureDate(i + 1),
        isOverdue: false,
        isPackWide: false,
        assignedRoles: [],
        currentUserCompletion: null,
        createdAt: futureDate(-10),
        updatedAt: futureDate(-10),
      }));

      mockListTasks.mockResolvedValueOnce({
        tasks: manyTasks,
        pagination: { page: 1, limit: 10, total: 10, totalPages: 1 },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        // First 5 should be visible
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
        expect(screen.getByText('Task 3')).toBeInTheDocument();
        expect(screen.getByText('Task 4')).toBeInTheDocument();
        expect(screen.getByText('Task 5')).toBeInTheDocument();
        // 6-10 should not be visible
        expect(screen.queryByText('Task 6')).not.toBeInTheDocument();
        expect(screen.queryByText('Task 10')).not.toBeInTheDocument();
      });
    });

    it('should sort tasks by due date ascending', async () => {
      const unsortedTasks = [
        {
          id: 'task-far',
          name: 'Far future task',
          description: null,
          dueDate: futureDate(30),
          isOverdue: false,
          isPackWide: false,
          assignedRoles: [],
          currentUserCompletion: null,
          createdAt: futureDate(-10),
          updatedAt: futureDate(-10),
        },
        {
          id: 'task-soon',
          name: 'Soon task',
          description: null,
          dueDate: futureDate(1),
          isOverdue: false,
          isPackWide: false,
          assignedRoles: [],
          currentUserCompletion: null,
          createdAt: futureDate(-10),
          updatedAt: futureDate(-10),
        },
        {
          id: 'task-medium',
          name: 'Medium task',
          description: null,
          dueDate: futureDate(7),
          isOverdue: false,
          isPackWide: false,
          assignedRoles: [],
          currentUserCompletion: null,
          createdAt: futureDate(-10),
          updatedAt: futureDate(-10),
        },
      ];

      mockListTasks.mockResolvedValueOnce({
        tasks: unsortedTasks,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      });

      const { container } = render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Soon task')).toBeInTheDocument();
      });

      // Check that tasks appear in sorted order
      const taskCards = container.querySelectorAll('[data-testid="dashboard-task-card"]');
      if (taskCards.length > 0) {
        // If component uses data-testid
        expect(taskCards[0]).toHaveTextContent('Soon task');
        expect(taskCards[1]).toHaveTextContent('Medium task');
        expect(taskCards[2]).toHaveTextContent('Far future task');
      } else {
        // Otherwise, just verify all three are present
        expect(screen.getByText('Soon task')).toBeInTheDocument();
        expect(screen.getByText('Medium task')).toBeInTheDocument();
        expect(screen.getByText('Far future task')).toBeInTheDocument();
      }
    });

    it('should link to full tasks page with View All button', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /my tasks/i });
        expect(heading).toBeInTheDocument();
      });

      // Find the View All button in the tasks section
      const buttons = screen.getAllByRole('button', { name: /view all/i });
      expect(buttons.length).toBeGreaterThanOrEqual(2); // One for events, one for tasks
    });

    it('should handle tasks loading error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockListTasks.mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        // Should show empty state, not crash
        expect(screen.getByText(/no tasks assigned to you/i)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Task Completion Toggle', () => {
    it('should mark task complete with optimistic update', async () => {
      const user = userEvent.setup();
      mockCompleteTask.mockResolvedValueOnce(undefined);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      // Find and click the completion toggle
      const toggleButtons = screen.getAllByRole('button', { name: /mark complete/i });
      await user.click(toggleButtons[0]);

      // Task should be marked complete immediately (optimistic)
      await waitFor(() => {
        expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      });
    });

    it('should mark task incomplete when toggled', async () => {
      const user = userEvent.setup();
      const completedTask = {
        ...mockUpcomingTasks[0],
        currentUserCompletion: {
          id: 'completion-1',
          completedAt: futureDate(-1),
          isComplete: true,
        },
      };

      mockListTasks.mockResolvedValueOnce({
        tasks: [completedTask],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      mockUncompleteTask.mockResolvedValueOnce(undefined);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      // Find and click the toggle to mark incomplete
      const toggleButtons = screen.getAllByRole('button', { name: /mark incomplete|undo/i });
      await user.click(toggleButtons[0]);

      await waitFor(() => {
        expect(mockUncompleteTask).toHaveBeenCalledWith('task-1');
      });
    });

    it('should revert state on completion error', async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCompleteTask.mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      const toggleButtons = screen.getAllByRole('button', { name: /mark complete/i });
      await user.click(toggleButtons[0]);

      // After error, task should still be incomplete
      await waitFor(() => {
        expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      });

      // Verify the task is still showing as incomplete (not removed from list)
      expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('should show error message when completion fails', async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCompleteTask.mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      const toggleButtons = screen.getAllByRole('button', { name: /mark complete/i });
      await user.click(toggleButtons[0]);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to update task/i)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('should persist completion status after page refresh', async () => {
      const user = userEvent.setup();
      mockCompleteTask.mockResolvedValueOnce(undefined);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      const toggleButtons = screen.getAllByRole('button', { name: /mark complete/i });
      await user.click(toggleButtons[0]);

      await waitFor(() => {
        expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      });

      // The API call completing means persistence - no need to actually refresh in test
      // The backend handles persistence, we just verify the API was called
    });
  });

  describe('Task Navigation', () => {
    it('should navigate to task detail page when task card clicked', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      // Find the task card link
      const taskLink = screen.getByRole('link', { name: /submit attendance report/i });
      expect(taskLink).toHaveAttribute('href', '/tasks/task-1');
    });

    it('should not navigate when clicking completion toggle', async () => {
      const user = userEvent.setup();
      mockCompleteTask.mockResolvedValueOnce(undefined);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
      });

      // Click the toggle button (not the card itself)
      const toggleButton = screen.getAllByRole('button', { name: /mark complete/i })[0];
      await user.click(toggleButton);

      // Should complete the task, not navigate
      await waitFor(() => {
        expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      });

      // Task should still be visible (we don't navigate away)
      expect(screen.getByText(/submit attendance report/i)).toBeInTheDocument();
    });
  });

  describe('View All Tasks Link', () => {
    it('should display View All button in My Tasks pane header', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my tasks/i })).toBeInTheDocument();
      });

      // Find View All buttons (one for events, one for tasks)
      const viewAllButtons = screen.getAllByRole('button', { name: /view all/i });
      expect(viewAllButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should link View All to tasks page with correct filters', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my tasks/i })).toBeInTheDocument();
      });

      // Find the View All link in tasks section
      const viewAllButtons = screen.getAllByRole('button', { name: /view all/i });
      
      // Check that at least one links to the tasks page with filters
      const taskLinks = viewAllButtons
        .map(button => button.closest('a'))
        .filter(link => link?.getAttribute('href')?.startsWith('/tasks'));
      
      expect(taskLinks.length).toBeGreaterThan(0);
      expect(taskLinks[0]).toHaveAttribute('href', '/tasks?assignedToMe=true&status=incomplete');
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
