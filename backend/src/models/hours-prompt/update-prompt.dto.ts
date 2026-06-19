import { z } from 'zod';

export const UpdatePromptSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export type UpdatePromptDto = z.infer<typeof UpdatePromptSchema>;
