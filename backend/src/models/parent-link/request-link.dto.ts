import { z } from 'zod';

export const RequestLinkSchema = z.object({
  childScoutId: z.string().min(1),
  relationshipType: z.string().trim().max(50).optional(),
});

export type RequestLinkDto = z.infer<typeof RequestLinkSchema>;
