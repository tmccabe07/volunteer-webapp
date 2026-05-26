import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AwardsPage from '@/app/awards/page';
import { awardService } from '@/services/awardService';

const pushMock = vi.fn();
const authMockState = {
  user: { id: 'leader-1', authTier: 'LEADER' },
  isLoading: false,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => authMockState,
}));

vi.mock('@/services/awardService', () => ({
  awardService: {
    getAwards: vi.fn(),
    transitionAward: vi.fn(),
    batchTransition: vi.fn(),
  },
}));

vi.mock('@/components/awards/TransitionAwardDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="transition-dialog" /> : null),
}));

vi.mock('@/components/awards/BatchTransitionDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="batch-dialog" /> : null),
}));

describe('Award fulfillment flow integration', () => {
  const mockGetAwards = vi.mocked(awardService.getAwards);

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAwards.mockResolvedValue({
      data: [
        {
          id: 'award-1',
          childScout: { id: 'child-1', name: 'Alex Scout', currentRank: 'WOLF' },
          award: { type: 'ADVENTURE', name: 'Call of the Wild' },
          currentState: 'ELIGIBLE',
          quantityNeeded: 1,
          createdAt: '2026-05-25T00:00:00.000Z',
          updatedAt: '2026-05-25T00:00:00.000Z',
        },
        {
          id: 'award-2',
          childScout: { id: 'child-2', name: 'Sam Scout', currentRank: 'WOLF' },
          award: { type: 'ADVENTURE', name: 'Paws on the Path' },
          currentState: 'APPROVED',
          quantityNeeded: 1,
          createdAt: '2026-05-25T00:00:00.000Z',
          updatedAt: '2026-05-25T00:00:00.000Z',
        },
      ],
    } as any);
  });

  it('loads queue and enables batch transition after multiple selection', async () => {
    render(<AwardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Award Fulfillment Dashboard')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Call of the Wild')).toBeInTheDocument();
      expect(screen.getByText('Paws on the Path')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Select Call of the Wild'));
    fireEvent.click(screen.getByLabelText('Select Paws on the Path'));

    expect(screen.getByRole('button', { name: 'Batch Transition (2)' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Batch Transition (2)' }));
    expect(screen.getByTestId('batch-dialog')).toBeInTheDocument();
  });
});
