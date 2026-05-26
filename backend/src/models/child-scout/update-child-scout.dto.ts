import { z } from 'zod';
import { RankLevel } from '@prisma/client';

/**
 * DTO for updating a child scout record
 * 
 * Authorization: ADMIN or parent with approved link
 * Used by: PATCH /api/child-scouts/:id
 * 
 * All fields are optional - partial update
 */
export const UpdateChildScoutSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name cannot be empty')
      .max(50, 'First name must be 50 characters or less')
      .trim()
      .optional(),
    
    lastName: z
      .string()
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name must be 50 characters or less')
      .trim()
      .optional(),
    
    currentRank: z
      .nativeEnum(RankLevel, {
        message: 'Invalid rank level',
      })
      .optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateChildScoutDto = z.infer<typeof UpdateChildScoutSchema>;
