import { AwardState } from '@prisma/client';
import { z } from 'zod';

export const TransitionAwardSchema = z.object({
  toState: z.nativeEnum(AwardState),
  notes: z.string().trim().max(1000).optional(),
  batchId: z.string().trim().min(1).max(100).optional(),
});

export type TransitionAwardDto = z.infer<typeof TransitionAwardSchema>;
