import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildScoutList from './ChildScoutList';
import { childScoutService } from '@/services/childScout.service';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/services/childScout.service', () => ({
  childScoutService: {
    listChildScouts: vi.fn(),
  },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ChildScoutList', () => {
  const mockListChildScouts = vi.mocked(childScoutService.listChildScouts);

  beforeEach(() => {
    vi.clearAllMocks();
    mockListChildScouts.mockResolvedValue({
      data: [
        {
          id: 'child-1',
          firstName: 'Alex',
          lastName: 'Scout',
          currentRank: 'WOLF',
          isActive: true,
          currentDen: {
            id: 'den-1',
            name: 'Wolf Den 1',
            denNumber: 1,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('loads and renders cub scout rows', async () => {
    render(<ChildScoutList />);

    await waitFor(() => {
      expect(mockListChildScouts).toHaveBeenCalledWith({
        rankLevel: undefined,
        denId: undefined,
        isActive: true,
        page: 1,
        limit: 50,
      });
    });

    expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    expect(screen.getAllByText('Wolf').length).toBeGreaterThan(0);
    expect(screen.getByText('Wolf Den 1')).toBeInTheDocument();
  });

  it('toggles include inactive filter and refetches', async () => {
    const user = userEvent.setup({ delay: null });
    render(<ChildScoutList />);

    await waitFor(() => {
      expect(mockListChildScouts).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByLabelText('Include Inactive'));

    await waitFor(() => {
      expect(mockListChildScouts).toHaveBeenLastCalledWith({
        rankLevel: undefined,
        denId: undefined,
        isActive: false,
        page: 1,
        limit: 50,
      });
    });
  });

  it('shows error and retries successfully', async () => {
    const user = userEvent.setup({ delay: null });

    mockListChildScouts
      .mockRejectedValueOnce({ response: { data: { error: 'Unable to load list' } } })
      .mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });

    render(<ChildScoutList />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load list')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Try Again' }));

    await waitFor(() => {
      expect(mockListChildScouts).toHaveBeenCalledTimes(2);
    });
  });
});
