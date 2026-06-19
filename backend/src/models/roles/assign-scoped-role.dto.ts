import { RankLevel, RoleScope } from '@prisma/client';
import { z } from 'zod';

export const AssignScopedRoleSchema = z
  .object({
    volunteerId: z.string().min(1, 'volunteerId is required'),
    roleId: z.string().min(1, 'roleId is required'),
    scopeType: z.nativeEnum(RoleScope),
    denNumber: z.number().int().positive().optional(),
    rankLevel: z.nativeEnum(RankLevel).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === 'DEN' && !data.denNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'denNumber is required for DEN scope',
        path: ['denNumber'],
      });
    }

    if (data.scopeType === 'RANK' && !data.rankLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rankLevel is required for RANK scope',
        path: ['rankLevel'],
      });
    }

    if (data.scopeType === 'PACK' && (data.denNumber || data.rankLevel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PACK scope cannot include denNumber or rankLevel',
      });
    }
  });

export type AssignScopedRoleDto = z.infer<typeof AssignScopedRoleSchema>;
