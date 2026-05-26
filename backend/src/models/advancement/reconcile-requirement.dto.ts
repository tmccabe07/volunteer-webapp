import { z } from 'zod';

export const ReconcileRequirementSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
  version: z.number().int().positive(),
});

export type ReconcileRequirementDto = z.infer<typeof ReconcileRequirementSchema>;
