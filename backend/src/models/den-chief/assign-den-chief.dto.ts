import { z } from 'zod';

export const AssignDenChiefSchema = z
  .object({
    denId: z.string().min(1),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.validFrom && data.validTo && data.validTo <= data.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validTo must be after validFrom',
        path: ['validTo'],
      });
    }
  });

export type AssignDenChiefDto = z.infer<typeof AssignDenChiefSchema>;
