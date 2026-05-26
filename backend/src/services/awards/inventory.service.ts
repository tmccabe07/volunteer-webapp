import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import prisma from '../../utils/prisma';
import { AdjustInventoryDto } from '../../models/awards/adjust-inventory.dto';
import { CreateInventoryItemDto } from '../../models/awards/create-inventory-item.dto';

@Injectable()
export class InventoryService {
  async createInventoryItem(input: CreateInventoryItemDto) {
    try {
      const created = await prisma.inventoryItem.create({
        data: {
          itemName: input.itemName,
          rankLevel: input.rankLevel ?? null,
          onHandQuantity: input.onHandQuantity ?? 0,
          reorderPoint: input.reorderPoint ?? null,
          unitCost: input.unitCost ?? null,
        },
      });

      return {
        id: created.id,
        itemName: created.itemName,
        rankLevel: created.rankLevel,
        onHandQuantity: created.onHandQuantity,
        reorderPoint: created.reorderPoint,
        unitCost: created.unitCost,
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Inventory item already exists for this rank scope');
      }

      throw error;
    }
  }

  async getInventory() {
    const rows = await prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      orderBy: [{ itemName: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      data: rows.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        rankLevel: item.rankLevel,
        onHandQuantity: item.onHandQuantity,
        reorderPoint: item.reorderPoint,
        unitCost: item.unitCost,
        updatedAt: item.updatedAt.toISOString(),
      })),
      reorderAlerts: rows
        .filter((item) => item.reorderPoint !== null && item.onHandQuantity <= item.reorderPoint)
        .map((item) => ({
          inventoryItemId: item.id,
          itemName: item.itemName,
          onHandQuantity: item.onHandQuantity,
          reorderPoint: item.reorderPoint,
        })),
    };
  }

  async adjustInventory(input: AdjustInventoryDto, userId: string) {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    const [updated] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: {
          onHandQuantity: {
            increment: input.quantityChange,
          },
        },
      }),
      prisma.inventoryAdjustment.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          quantityChange: input.quantityChange,
          reason: input.reason,
          adjustedBy: userId,
          notes: input.notes,
          linkedBatchId: input.linkedBatchId,
        },
      }),
    ]);

    return {
      id: updated.id,
      itemName: updated.itemName,
      onHandQuantity: updated.onHandQuantity,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
