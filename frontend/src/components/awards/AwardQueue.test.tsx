import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AwardQueue from './AwardQueue';
import { type AwardItem } from '@/services/awardService';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AwardQueue', () => {
  const items: AwardItem[] = [
    {
      id: 'award-1',
      childScout: { id: 'child-1', name: 'Alex Scout', currentRank: 'WOLF' },
      award: { type: 'ADVENTURE', name: 'Call of the Wild' },
      currentState: 'ELIGIBLE',
      quantityNeeded: 1,
      createdAt: '2026-05-25T00:00:00.000Z',
      updatedAt: '2026-05-25T00:00:00.000Z',
    },
  ];

  it('renders queue items', () => {
    render(
      <AwardQueue
        items={items}
        isLoading={false}
        error={null}
        selectedIds={[]}
        onSelectedIdsChange={vi.fn()}
        onRefresh={vi.fn()}
        onTransitionClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Call of the Wild')).toBeInTheDocument();
    expect(screen.getByText('Alex Scout • WOLF')).toBeInTheDocument();
  });

  it('updates selected IDs when item checkbox changes', () => {
    const onSelectedIdsChange = vi.fn();

    render(
      <AwardQueue
        items={items}
        isLoading={false}
        error={null}
        selectedIds={[]}
        onSelectedIdsChange={onSelectedIdsChange}
        onRefresh={vi.fn()}
        onTransitionClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Select Call of the Wild'));

    expect(onSelectedIdsChange).toHaveBeenCalledWith(['award-1']);
  });

  it('calls transition callback for selected item', () => {
    const onTransitionClick = vi.fn();

    render(
      <AwardQueue
        items={items}
        isLoading={false}
        error={null}
        selectedIds={[]}
        onSelectedIdsChange={vi.fn()}
        onRefresh={vi.fn()}
        onTransitionClick={onTransitionClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Transition' }));

    expect(onTransitionClick).toHaveBeenCalledWith(items[0]);
  });
});
