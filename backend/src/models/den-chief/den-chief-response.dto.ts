import { z } from 'zod';

export const DenChiefAssignmentResponseSchema = z.object({
  id: z.string(),
  denId: z.string(),
  denName: z.string(),
  denNumber: z.number(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
});

export const DenChiefResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  scoutbookId: z.string().nullable(),
  isActive: z.boolean(),
  assignments: z.array(DenChiefAssignmentResponseSchema),
});

export type DenChiefResponseDto = z.infer<typeof DenChiefResponseSchema>;
