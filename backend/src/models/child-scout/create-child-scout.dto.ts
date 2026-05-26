import { z } from 'zod';
import { RankLevel } from '@prisma/client';

/**
 * DTO for creating a child scout record
 * 
 * Authorization: ADMIN only
 * Used by: POST /api/child-scouts
 */
export const CreateChildScoutSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .trim(),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .trim(),
  
  currentRank: z.nativeEnum(RankLevel, {
    message: 'Invalid rank level',
  }),
  
  scoutbookId: z
    .string()
    .optional()
    .transform(val => val?.trim() || undefined),
});

export type CreateChildScoutDto = z.infer<typeof CreateChildScoutSchema>;
