import { z } from 'zod';

export const PromptParentForRequirementSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export type PromptParentForRequirementDto = z.infer<typeof PromptParentForRequirementSchema>;
