import { z } from 'zod';

export const TransferChildSchema = z.object({
  childScoutId: z.string().min(1, 'Child scout ID is required'),
  fromDenId: z.string().min(1).nullable().optional(),
  toDenId: z.string().min(1, 'Destination den ID is required'),
  effectiveDate: z
    .string()
    .datetime('Invalid ISO 8601 date format')
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(200, 'Reason must be 200 characters or less')
    .trim(),
});

export type TransferChildDto = z.infer<typeof TransferChildSchema>;