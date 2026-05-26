import { z } from 'zod';

/**
 * DTO for assigning a child to a den
 * 
 * Authorization: LEADER with scope or ADMIN
 * Used by: POST /api/dens/:id/members
 */
export const AssignDenMemberSchema = z.object({
  childScoutId: z
    .string()
    .min(1, 'Child scout ID is required'),
  
  effectiveDate: z
    .string()
    .datetime('Invalid ISO 8601 date format')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  
  reason: z
    .string()
    .max(200, 'Reason must be 200 characters or less')
    .trim()
    .optional(),
});

export type AssignDenMemberDto = z.infer<typeof AssignDenMemberSchema>;
