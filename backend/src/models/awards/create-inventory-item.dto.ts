import { RankLevel } from '@prisma/client';
import { z } from 'zod';


export const CreateInventoryItemSchema = z.object({
  itemName: z.string().trim().min(1).max(100),
  rankLevel: z.nativeEnum(RankLevel).nullable().optional(),
  denId: z.string().nullable().optional(),
  onHandQuantity: z.number().int().min(0).optional().default(0),
  reorderPoint: z.number().int().min(0).nullable().optional(),
  unitCost: z.number().nonnegative().nullable().optional(),
});

export type CreateInventoryItemDto = z.infer<typeof CreateInventoryItemSchema>;
