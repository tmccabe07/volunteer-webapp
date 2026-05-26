import { z } from 'zod';

export const CreateSpecialAwardSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(1).max(100),
  requiresNomination: z.boolean().optional().default(false),
});

export type CreateSpecialAwardDto = z.infer<typeof CreateSpecialAwardSchema>;
