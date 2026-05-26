import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InventoryList from './InventoryList';
import { type InventoryItem } from '@/services/awardService';

describe('InventoryList', () => {
  const items: InventoryItem[] = [
    {
      id: 'item-1',
      itemName: 'Wolf Badge',
      rankLevel: 'WOLF',
      onHandQuantity: 2,
      reorderPoint: 3,
      unitCost: 1.25,
      updatedAt: '2026-05-25T00:00:00.000Z',
    },
  ];

  it('renders inventory rows', () => {
    render(<InventoryList items={items} onAdjust={vi.fn()} />);

    expect(screen.getByText('Wolf Badge')).toBeInTheDocument();
    expect(screen.getByText('WOLF')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
  });

  it('invokes onAdjust callback', () => {
    const onAdjust = vi.fn();
    render(<InventoryList items={items} onAdjust={onAdjust} />);

    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }));

    expect(onAdjust).toHaveBeenCalledWith(items[0]);
  });
});
