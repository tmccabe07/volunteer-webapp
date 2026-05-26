import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HoursPromptConfig from './HoursPromptConfig';
import { hoursPromptService } from '@/services/hoursPromptService';

vi.mock('@/services/hoursPromptService', () => ({
  hoursPromptService: {
    generatePrompts: vi.fn(),
  },
}));

vi.mock('./CategoryPromptForm', () => ({
  default: ({ category, onChange }: { category: 'CAMPING' | 'HIKING' | 'SERVICE'; onChange: (value: any) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          enabled: true,
          childScoutIds: ['child-1'],
          categoryData:
            category === 'HIKING'
              ? { miles: 2 }
              : category === 'CAMPING'
              ? { nights: 1 }
              : { hours: 1 },
        })
      }
    >
      Configure {category}
    </button>
  ),
}));

describe('HoursPromptConfig', () => {
  const mockGeneratePrompts = vi.mocked(hoursPromptService.generatePrompts);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGeneratePrompts.mockResolvedValue({
      eventId: 'event-1',
      promptsGenerated: 1,
      prompts: [],
    });
  });

  it('generates prompts from configured categories', async () => {
    const user = userEvent.setup({ delay: null });
    const onGenerated = vi.fn();

    render(
      <HoursPromptConfig
        eventId="event-1"
        attendanceRecords={[
          {
            child: {
              id: 'child-1',
              firstName: 'Alex',
              lastName: 'Scout',
            },
            attendanceStatus: 'PRESENT',
            coveredRequirements: [],
          },
        ]}
        onGenerated={onGenerated}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Configure HIKING' }));
    await user.click(screen.getByRole('button', { name: 'Generate Prompts' }));

    await waitFor(() => {
      expect(mockGeneratePrompts).toHaveBeenCalledWith('event-1', {
        categoryPrompts: [
          {
            category: 'HIKING',
            categoryData: { miles: 2 },
            childScoutIds: ['child-1'],
          },
        ],
      });
    });

    expect(onGenerated).toHaveBeenCalledWith(1);
    expect(screen.getByText('Generated 1 Scoutbook prompt(s).')).toBeInTheDocument();
  });
});
