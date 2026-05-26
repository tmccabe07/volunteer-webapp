import { z } from 'zod';

export const SpecialAwardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string(),
  requiresNomination: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SpecialAwardResponseDto = z.infer<typeof SpecialAwardResponseSchema>;
