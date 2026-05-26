import { CompletionType } from '@prisma/client';
import { z } from 'zod';

export const CompleteRequirementSchema = z.object({
  childScoutId: z.string().min(1),
  completionType: z.nativeEnum(CompletionType),
  notes: z.string().trim().max(1000).optional(),
});

export type CompleteRequirementDto = z.infer<typeof CompleteRequirementSchema>;
