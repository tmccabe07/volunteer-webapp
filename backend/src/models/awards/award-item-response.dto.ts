import { AwardState, RankLevel } from '@prisma/client';
import { z } from 'zod';

export const AwardItemResponseSchema = z.object({
  id: z.string(),
  childScout: z.object({
    id: z.string(),
    name: z.string(),
    currentRank: z.nativeEnum(RankLevel),
  }),
  award: z.object({
    type: z.enum(['ADVENTURE', 'SPECIAL']),
    name: z.string(),
  }),
  currentState: z.nativeEnum(AwardState),
  quantityNeeded: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AwardItemResponseDto = z.infer<typeof AwardItemResponseSchema>;
