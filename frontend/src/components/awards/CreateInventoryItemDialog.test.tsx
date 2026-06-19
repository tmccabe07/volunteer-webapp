import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateInventoryItemDialog from './CreateInventoryItemDialog';
import { awardService } from '@/services/awardService';
import { advancementService } from '@/services/advancement.service';

vi.mock('@/services/awardService', () => ({
  awardService: {
    createInventoryItem: vi.fn(),
  },
}));

vi.mock('@/services/advancement.service', () => ({
  advancementService: {
    getAdventures: vi.fn(),
  },
}));

describe('CreateInventoryItemDialog', () => {
  const mockCreateInventoryItem = vi.mocked(awardService.createInventoryItem);
  const mockGetAdventures = vi.mocked(advancementService.getAdventures);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdventures.mockResolvedValue({
      data: [
        {
          id: 'adventure-1',
          rankId: 'rank-1',
          rankLevel: 'WOLF',
          name: 'Call of the Wild',
          classification: 'REQUIRED',
          displayOrder: 1,
          requirements: [],
        },
      ],
    } as any);
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

    await waitFor(() => {
      expect(mockGetAdventures).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Wolf Badge' } });
    fireEvent.change(screen.getByLabelText('On Hand'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Reorder Point'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Unit Cost'), { target: { value: '1.25' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateInventoryItem).toHaveBeenCalledWith({
        itemName: 'Wolf Badge',
        rankLevel: 'WOLF',
        denId: null,
        onHandQuantity: 3,
        reorderPoint: 1,
        unitCost: 1.25,
      });
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('allows custom free-text item names for special awards', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();

    render(<CreateInventoryItemDialog open={true} onClose={onClose} onCreated={onCreated} />);

    await waitFor(() => {
      expect(mockGetAdventures).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByText('Custom / Special Award (free text)'));

    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Pinewood Derby Special' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Item' }));

    await waitFor(() => {
      expect(mockCreateInventoryItem).toHaveBeenCalledWith(
        expect.objectContaining({
          itemName: 'Pinewood Derby Special',
        }),
      );
    });
  });
});
