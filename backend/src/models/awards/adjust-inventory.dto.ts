import { z } from 'zod';

export const AdjustInventorySchema = z.object({
  inventoryItemId: z.string().min(1),
  quantityChange: z.number().int().refine((value) => value !== 0, {
    message: 'quantityChange must be non-zero',
  }),
  reason: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(1000).optional(),
  linkedBatchId: z.string().trim().min(1).max(100).optional(),
});

export type AdjustInventoryDto = z.infer<typeof AdjustInventorySchema>;
