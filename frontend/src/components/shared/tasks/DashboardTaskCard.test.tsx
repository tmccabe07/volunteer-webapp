import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardTaskCard from './DashboardTaskCard';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('DashboardTaskCard', () => {
  const mockIncompleteTask = {
    id: 'task-1',
    name: 'Submit attendance report',
    dueDate: '2026-05-15T18:00:00Z',
    currentUserCompletion: null,
  };

  const mockCompleteTask = {
    id: 'task-2',
    name: 'Update roster',
    dueDate: '2026-05-20T17:00:00Z',
    currentUserCompletion: {
      id: 'completion-1',
    },
  };

  describe('Rendering', () => {
    it('should render task name', () => {
      render(<DashboardTaskCard task={mockIncompleteTask} />);

      expect(screen.getByText('Submit attendance report')).toBeInTheDocument();
    });

    it('should render formatted due date', () => {
      render(<DashboardTaskCard task={mockIncompleteTask} />);

      expect(screen.getByText(/may 15, 2026/i)).toBeInTheDocument();
    });

    it('should link to task detail page', () => {
      render(<DashboardTaskCard task={mockIncompleteTask} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/tasks/task-1');
    });

    it('should apply hover styles', () => {
      const { container } = render(<DashboardTaskCard task={mockIncompleteTask} />);

      const card = container.querySelector('.hover\\:bg-gray-50');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Completion Status', () => {
    it('should not show completion badge for incomplete task', () => {
      render(<DashboardTaskCard task={mockIncompleteTask} />);

      expect(screen.queryByText(/complete/i)).not.toBeInTheDocument();
    });

    it('should show completion badge for completed task', () => {
      render(<DashboardTaskCard task={mockCompleteTask} />);

      expect(screen.getByText(/✓ complete/i)).toBeInTheDocument();
    });

    it('should style completion badge in green', () => {
      const { container } = render(<DashboardTaskCard task={mockCompleteTask} />);

      const badge = screen.getByText(/✓ complete/i);
      expect(badge).toHaveClass('text-green-600');
    });
  });

  describe('Date Formatting', () => {
    it('should format date with weekday, month, day, year', () => {
      render(<DashboardTaskCard task={mockIncompleteTask} />);

      // Should include "Wed" (weekday), "May" (month), "15" (day), "2026" (year)
      const dateText = screen.getByText(/may 15, 2026/i);
      expect(dateText.textContent).toMatch(/\w+, \w+ \d+, \d{4}/);
    });

    it('should handle different date formats', () => {
      const taskWithDifferentDate = {
        ...mockIncompleteTask,
        dueDate: '2026-12-25T00:00:00Z',
      };

      render(<DashboardTaskCard task={taskWithDifferentDate} />);

      // Check for December 2026 (timezone may affect exact day)
      expect(screen.getByText(/dec \d+, 2026/i)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should use compact card layout', () => {
      const { container } = render(<DashboardTaskCard task={mockIncompleteTask} />);

      const card = container.querySelector('.p-3.border.rounded-lg');
      expect(card).toBeInTheDocument();
    });

    it('should have proper text sizing', () => {
      const { container } = render(<DashboardTaskCard task={mockIncompleteTask} />);

      const taskName = screen.getByText('Submit attendance report');
      expect(taskName).toHaveClass('font-medium');

      const dateText = screen.getByText(/may 15, 2026/i);
      expect(dateText).toHaveClass('text-sm');
    });
  });
});
