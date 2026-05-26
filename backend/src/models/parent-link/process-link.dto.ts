import { z } from 'zod';

export const ProcessLinkSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type ProcessLinkDto = z.infer<typeof ProcessLinkSchema>;
