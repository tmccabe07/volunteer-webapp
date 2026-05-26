import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReconciliationQueue from './ReconciliationQueue';
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
  },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./ReconcileRequirementDialog', () => ({
  default: ({ open, item }: { open: boolean; item: { id: string } | null }) =>
    open ? <div data-testid="reconcile-dialog">Dialog for {item?.id}</div> : null,
}));

describe('ReconciliationQueue', () => {
  const mockListDens = vi.mocked(denService.listDens);
  const mockGetPendingReconciliation = vi.mocked(advancementService.getPendingReconciliation);

  beforeEach(() => {
    vi.clearAllMocks();
    mockListDens.mockResolvedValue({
      data: [{ id: 'den-1', name: 'Wolf Den 1' } as any],
    });
    mockGetPendingReconciliation.mockResolvedValue({
      data: [
        {
          id: 'prog-1',
          version: 2,
          childScout: {
            id: 'child-1',
            name: 'Alex Scout',
            currentRank: 'WOLF',
            denName: 'Wolf Den 1',
          },
          requirement: {
            id: 'req-1',
            adventureName: 'Call of the Wild',
            requirementText: 'Complete requirement text',
          },
          completedAt: '2026-05-20T12:00:00.000Z',
          completionType: 'PARENT_SUBMIT' as const,
          daysSinceCompletion: 4,
        },
      ],
    });
  });

  it('loads and renders reconciliation rows', async () => {
    render(<ReconciliationQueue />);

    await waitFor(() => {
      expect(mockGetPendingReconciliation).toHaveBeenCalled();
    });

    expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    expect(screen.getByText('Call of the Wild')).toBeInTheDocument();
    expect(screen.getAllByText('Parent Submit').length).toBeGreaterThan(0);
    expect(screen.getByText('4 days')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens reconcile dialog when reconcile button is clicked', async () => {
    render(<ReconciliationQueue />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reconcile' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(screen.getByTestId('reconcile-dialog')).toHaveTextContent('Dialog for prog-1');
  });

  it('shows error state when queue load fails', async () => {
    mockGetPendingReconciliation.mockRejectedValueOnce({
      response: { data: { error: 'Queue unavailable' } },
    });

    render(<ReconciliationQueue />);

    await waitFor(() => {
      expect(screen.getByText('Queue unavailable')).toBeInTheDocument();
    });
  });
});
