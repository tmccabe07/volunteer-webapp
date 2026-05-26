import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdvancementProgress from './AdvancementProgress';
import type { ChildAdvancementProgress } from '@/services/advancement.service';

vi.mock('./AdventureCard', () => ({
  default: ({ adventure }: { adventure: { name: string } }) => (
    <div data-testid="adventure-card">Adventure: {adventure.name}</div>
  ),
}));

describe('AdvancementProgress', () => {
  const baseProgress: ChildAdvancementProgress = {
    childScout: {
      id: 'child-1',
      name: 'Alex Scout',
      currentRank: 'WOLF',
    },
    rankProgress: {
      rankLevel: 'WOLF',
      requiredAdventuresNeeded: 6,
      requiredAdventuresCompleted: 3,
      electiveAdventuresNeeded: 2,
      electiveAdventuresCompleted: 1,
      isRankEligible: false,
    },
    adventures: [
      {
        id: 'adv-1',
        name: 'Call of the Wild',
        classification: 'REQUIRED',
        totalRequirements: 3,
        completedRequirements: 2,
        percentComplete: 67,
        isComplete: false,
        requirements: [],
      },
      {
        id: 'adv-2',
        name: 'Paws on the Path',
        classification: 'REQUIRED',
        totalRequirements: 2,
        completedRequirements: 2,
        percentComplete: 100,
        isComplete: true,
        requirements: [],
      },
    ],
  };

  it('renders cub scout summary and adventure counts', () => {
    render(<AdvancementProgress progress={baseProgress} canComplete={true} onRefresh={vi.fn()} />);

    expect(screen.getByText('Alex Scout')).toBeInTheDocument();
    expect(screen.getByText('Current Rank: WOLF')).toBeInTheDocument();
    expect(screen.getByText('3 / 6')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders all adventure cards', () => {
    render(<AdvancementProgress progress={baseProgress} canComplete={false} onRefresh={vi.fn()} />);

    const cards = screen.getAllByTestId('adventure-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Adventure: Call of the Wild')).toBeInTheDocument();
    expect(screen.getByText('Adventure: Paws on the Path')).toBeInTheDocument();
  });

  it('shows rank eligible badge when thresholds are met', () => {
    const progress: ChildAdvancementProgress = {
      ...baseProgress,
      rankProgress: {
        ...baseProgress.rankProgress,
        requiredAdventuresCompleted: 6,
        electiveAdventuresCompleted: 2,
        isRankEligible: true,
      },
    };

    render(<AdvancementProgress progress={progress} canComplete={true} onRefresh={vi.fn()} />);

    expect(screen.getByText('Rank Eligible')).toBeInTheDocument();
  });
});
