import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParentPromptsList from './ParentPromptsList';
import { hoursPromptService } from '@/services/hoursPromptService';

vi.mock('@/services/hoursPromptService', () => ({
  hoursPromptService: {
    getPrompts: vi.fn(),
    acknowledgePrompt: vi.fn(),
    dismissPrompt: vi.fn(),
  },
}));

vi.mock('./PromptDetailCard', () => ({
  default: ({ prompt, onAcknowledge, onDismiss }: any) => (
    <div>
      <span>{prompt.childScout.name}</span>
      <button type="button" onClick={() => onAcknowledge(prompt)}>
        Ack {prompt.id}
      </button>
      <button type="button" onClick={() => onDismiss(prompt)}>
        Dismiss {prompt.id}
      </button>
    </div>
  ),
}));

vi.mock('./AcknowledgePromptDialog', () => ({
  default: ({ open, mode, prompt, onConfirm }: any) =>
    open ? (
      <button type="button" onClick={() => onConfirm(prompt.id)}>
        Confirm {mode}
      </button>
    ) : null,
}));

describe('ParentPromptsList', () => {
  const mockGetPrompts = vi.mocked(hoursPromptService.getPrompts);
  const mockAcknowledgePrompt = vi.mocked(hoursPromptService.acknowledgePrompt);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrompts.mockResolvedValue({
      data: [
        {
          id: 'prompt-1',
          childScout: { id: 'child-1', name: 'Alex Scout' },
          event: { id: 'event-1', title: 'Hike', eventDate: '2026-05-20T00:00:00.000Z' },
          category: 'HIKING',
          categoryData: { miles: 2 },
          message: 'Suggested Scoutbook entry',
          status: 'PENDING',
          generatedAt: '2026-05-21T00:00:00.000Z',
        },
      ],
    });
    mockAcknowledgePrompt.mockResolvedValue({
      id: 'prompt-1',
      status: 'ACKNOWLEDGED',
      acknowledgedAt: '2026-05-22T00:00:00.000Z',
    });
  });

  it('loads prompts and acknowledges one through dialog flow', async () => {
    const user = userEvent.setup({ delay: null });

    render(<ParentPromptsList />);

    await waitFor(() => {
      expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Ack prompt-1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm acknowledge' }));

    await waitFor(() => {
      expect(mockAcknowledgePrompt).toHaveBeenCalledWith('prompt-1', undefined);
    });

    await waitFor(() => {
      expect(mockGetPrompts).toHaveBeenCalledTimes(2);
    });
  });
});
