import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HoursPromptConfig from '@/components/den/HoursPromptConfig';
import ParentPromptsList from '@/components/parent/ParentPromptsList';
import { hoursPromptService } from '@/services/hoursPromptService';

vi.mock('@/services/hoursPromptService', () => ({
  hoursPromptService: {
    generatePrompts: vi.fn(),
    getPrompts: vi.fn(),
    acknowledgePrompt: vi.fn(),
    dismissPrompt: vi.fn(),
  },
}));

vi.mock('@/components/den/CategoryPromptForm', () => ({
  default: ({ category, onChange }: any) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          enabled: true,
          childScoutIds: ['child-1'],
          categoryData: category === 'HIKING' ? { miles: 3 } : {},
        })
      }
    >
      Configure {category}
    </button>
  ),
}));

vi.mock('@/components/parent/PromptDetailCard', () => ({
  default: ({ prompt, onAcknowledge }: any) => (
    <button type="button" onClick={() => onAcknowledge(prompt)}>
      Prompt {prompt.id}
    </button>
  ),
}));

vi.mock('@/components/parent/AcknowledgePromptDialog', () => ({
  default: ({ open, prompt, onConfirm }: any) =>
    open ? (
      <button type="button" onClick={() => onConfirm(prompt.id)}>
        Confirm Prompt
      </button>
    ) : null,
}));

describe('Hours Prompt Flow Integration', () => {
  const mockGeneratePrompts = vi.mocked(hoursPromptService.generatePrompts);
  const mockGetPrompts = vi.mocked(hoursPromptService.getPrompts);
  const mockAcknowledgePrompt = vi.mocked(hoursPromptService.acknowledgePrompt);

  beforeEach(() => {
    vi.clearAllMocks();

    mockGeneratePrompts.mockResolvedValue({
      eventId: 'event-1',
      promptsGenerated: 1,
      prompts: [
        {
          id: 'prompt-1',
          childScoutId: 'child-1',
          category: 'HIKING',
          categoryData: { miles: 3 },
          status: 'PENDING',
        },
      ],
    });

    mockGetPrompts.mockResolvedValue({
      data: [
        {
          id: 'prompt-1',
          childScout: { id: 'child-1', name: 'Alex Scout' },
          event: { id: 'event-1', title: 'Pack Hike', eventDate: '2026-05-20T00:00:00.000Z' },
          category: 'HIKING',
          categoryData: { miles: 3 },
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

  it('generates prompts in closeout and acknowledges in parent queue', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <div>
        <HoursPromptConfig
          eventId="event-1"
          attendanceRecords={[
            {
              child: { id: 'child-1', firstName: 'Alex', lastName: 'Scout' },
              attendanceStatus: 'PRESENT',
              coveredRequirements: [],
            },
          ]}
        />
        <ParentPromptsList />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Configure HIKING' }));
    await user.click(screen.getByRole('button', { name: 'Generate Prompts' }));

    await waitFor(() => {
      expect(mockGeneratePrompts).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Prompt prompt-1' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Prompt prompt-1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Prompt' }));

    await waitFor(() => {
      expect(mockAcknowledgePrompt).toHaveBeenCalledWith('prompt-1', undefined);
    });
  });
});
