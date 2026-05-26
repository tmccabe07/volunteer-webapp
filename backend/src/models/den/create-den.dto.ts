import { z } from 'zod';
import { RankLevel } from '@prisma/client';

/**
 * DTO for creating a den
 * 
 * Authorization: ADMIN only
 * Used by: POST /api/dens
 */
export const CreateDenSchema = z.object({
  name: z
    .string()
    .min(1, 'Den name is required')
    .max(100, 'Den name must be 100 characters or less')
    .trim(),
  
  denNumber: z
    .number()
    .int('Den number must be an integer')
    .positive('Den number must be positive'),
  
  rankLevel: z
    .nativeEnum(RankLevel, {
      message: 'Invalid rank level',
    })
    .refine(level => level !== 'PACK_WIDE' as any, {
      message: 'Den cannot have PACK_WIDE rank level',
    }),
});

export type CreateDenDto = z.infer<typeof CreateDenSchema>;
