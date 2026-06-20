import { CalendarFeedScope } from '@prisma/client';
import { z } from 'zod';

export const CalendarFeedRegenerateSchema = z
  .object({
    scopeType: z.nativeEnum(CalendarFeedScope),
    denId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === CalendarFeedScope.DEN && !data.denId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'denId is required for DEN scope regeneration',
        path: ['denId'],
      });
    }

    if (data.scopeType === CalendarFeedScope.PACK && data.denId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'denId must not be provided for PACK scope regeneration',
        path: ['denId'],
      });
    }
  });

export type CalendarFeedRegenerateDto = z.infer<typeof CalendarFeedRegenerateSchema>;

export interface CalendarFeedDescriptorDto {
  scopeType: CalendarFeedScope;
  denId: string | null;
  displayName: string;
  feedUrl: string;
  isActive: boolean;
  lastAccessedAt: string | null;
}
