import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateInventoryItemDialog from './CreateInventoryItemDialog';
import { awardService } from '@/services/awardService';

vi.mock('@/services/awardService', () => ({
  awardService: {
    createInventoryItem: vi.fn(),
  },
}));

describe('CreateInventoryItemDialog', () => {
  const mockCreateInventoryItem = vi.mocked(awardService.createInventoryItem);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInventoryItem.mockResolvedValue({
      id: 'item-1',
      itemName: 'Wolf Badge',
      rankLevel: 'WOLF',
      onHandQuantity: 3,
      reorderPoint: 1,
      unitCost: 1.25,
      updatedAt: '2026-05-25T00:00:00.000Z',
    } as any);
  });

  it('creates inventory item from form input', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();

    render(<CreateInventoryItemDialog open={true} onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Wolf Badge' } });
    fireEvent.change(screen.getByLabelText('On Hand'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Reorder Point'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Unit Cost'), { target: { value: '1.25' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateInventoryItem).toHaveBeenCalledWith({
        itemName: 'Wolf Badge',
        rankLevel: null,
        onHandQuantity: 3,
        reorderPoint: 1,
        unitCost: 1.25,
      });
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
