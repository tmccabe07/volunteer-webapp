import { z } from 'zod';

export const CreateDenChiefSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.email(),
  password: z.string().min(8).max(128),
  scoutbookId: z.string().trim().min(1).optional(),
});

export type CreateDenChiefDto = z.infer<typeof CreateDenChiefSchema>;
