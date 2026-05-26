import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconciliationQueue from '@/components/advancement/ReconciliationQueue';
import { denService } from '@/services/den.service';
import { advancementService } from '@/services/advancement.service';

vi.mock('@/services/den.service', () => ({
  denService: {
    listDens: vi.fn(),
  },
}));

vi.mock('@/services/advancement.service', () => ({
  advancementService: {
    getPendingReconciliation: vi.fn(),
    reconcileRequirement: vi.fn(),
  },
}));

describe('Parent Completion Flow Integration', () => {
  const mockListDens = vi.mocked(denService.listDens);
  const mockGetPendingReconciliation = vi.mocked(advancementService.getPendingReconciliation);
  const mockReconcileRequirement = vi.mocked(advancementService.reconcileRequirement);

  const queueItem = {
    id: 'prog-1',
    version: 1,
    childScout: {
      id: 'child-1',
      name: 'Alex Scout',
      currentRank: 'WOLF',
      denName: 'Wolf Den 1',
    },
    requirement: {
      id: 'req-1',
      adventureName: 'Call of the Wild',
      requirementText: 'Do the requirement',
    },
    completedAt: '2026-05-20T12:00:00.000Z',
    completionType: 'PARENT_SUBMIT' as const,
    daysSinceCompletion: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListDens.mockResolvedValue({ data: [] as any[] });
    mockGetPendingReconciliation.mockResolvedValue({ data: [queueItem] });
  });

  it('handles optimistic-lock conflict and shows current state from 409', async () => {
    const user = userEvent.setup({ delay: null });

    mockReconcileRequirement.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error: 'Conflict: requirement progress was updated by another request',
          current: {
            id: 'prog-1',
            scoutbookStatus: 'ENTERED',
            version: 2,
          },
        },
      },
    });

    render(<ReconciliationQueue />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reconcile' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reconcile' }));
    await user.click(screen.getByRole('button', { name: 'Mark as Entered' }));

    await waitFor(() => {
      expect(screen.getByText('Current record state:')).toBeInTheDocument();
    });

    expect(screen.getByText('Status: ENTERED')).toBeInTheDocument();
    expect(screen.getByText('Version: 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Queue' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh Queue' }));

    await waitFor(() => {
      expect(mockGetPendingReconciliation).toHaveBeenCalledTimes(2);
    });
  });
});
