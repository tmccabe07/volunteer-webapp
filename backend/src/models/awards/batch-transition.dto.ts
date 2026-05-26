import { AwardState } from '@prisma/client';
import { z } from 'zod';

export const BatchTransitionSchema = z.object({
  awardIds: z.array(z.string().min(1)).min(1),
  toState: z.nativeEnum(AwardState),
  notes: z.string().trim().max(1000).optional(),
});

export type BatchTransitionDto = z.infer<typeof BatchTransitionSchema>;
