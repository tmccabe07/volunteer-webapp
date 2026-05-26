import { RankLevel } from '@prisma/client';
import { z } from 'zod';

export const InventoryItemResponseSchema = z.object({
  id: z.string(),
  itemName: z.string(),
  rankLevel: z.nativeEnum(RankLevel).nullable(),
  onHandQuantity: z.number().int(),
  reorderPoint: z.number().int().nullable(),
  unitCost: z.number().nullable(),
  updatedAt: z.string(),
});

export type InventoryItemResponseDto = z.infer<typeof InventoryItemResponseSchema>;
