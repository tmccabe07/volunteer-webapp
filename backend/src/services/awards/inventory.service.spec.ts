import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

const mockPrisma = {
  inventoryItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  inventoryAdjustment: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  get default() {
    return mockPrisma;
  },
}));

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService();
    jest.clearAllMocks();
  });

  it('returns inventory with reorder alerts', async () => {
    mockPrisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        itemName: 'Wolf Badge',
        rankLevel: 'WOLF',
        onHandQuantity: 2,
        reorderPoint: 3,
        unitCost: 1.25,
        updatedAt: new Date('2026-05-25T00:00:00.000Z'),
      },
    ]);

    const result = await service.getInventory();

    expect(result.data).toHaveLength(1);
    expect(result.reorderAlerts).toHaveLength(1);
    expect(result.reorderAlerts[0].itemName).toBe('Wolf Badge');
  });

  it('creates inventory item', async () => {
    mockPrisma.inventoryItem.create.mockResolvedValue({
      id: 'item-2',
      itemName: 'Bear Badge',
      rankLevel: 'BEAR',
      onHandQuantity: 6,
      reorderPoint: 2,
      unitCost: 1.5,
      updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    });

    const result = await service.createInventoryItem({
      itemName: 'Bear Badge',
      rankLevel: 'BEAR',
      onHandQuantity: 6,
      reorderPoint: 2,
      unitCost: 1.5,
    });

    expect(result.itemName).toBe('Bear Badge');
    expect(result.rankLevel).toBe('BEAR');
  });

  it('throws conflict for duplicate inventory item', async () => {
    mockPrisma.inventoryItem.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createInventoryItem({
        itemName: 'Bear Badge',
        rankLevel: 'BEAR',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adjusts inventory and creates adjustment record', async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({ id: 'item-1' });
    mockPrisma.inventoryItem.update.mockResolvedValue({
      id: 'item-1',
      itemName: 'Wolf Badge',
      onHandQuantity: 10,
      updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    });
    mockPrisma.inventoryAdjustment.create.mockResolvedValue({ id: 'adj-1' });
    mockPrisma.$transaction.mockResolvedValue([
      {
        id: 'item-1',
        itemName: 'Wolf Badge',
        onHandQuantity: 10,
        updatedAt: new Date('2026-05-25T00:00:00.000Z'),
      },
      { id: 'adj-1' },
    ]);

    const result = await service.adjustInventory(
      {
        inventoryItemId: 'item-1',
        quantityChange: 4,
        reason: 'Purchase',
      },
      'leader-1',
    );

    expect(result.onHandQuantity).toBe(10);
  });

  it('throws not found for missing inventory item', async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue(null);

    await expect(
      service.adjustInventory(
        {
          inventoryItemId: 'missing',
          quantityChange: 1,
          reason: 'Correction',
        },
        'leader-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
