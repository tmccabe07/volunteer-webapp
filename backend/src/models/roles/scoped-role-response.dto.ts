import { RankLevel, RoleScope } from '@prisma/client';
import { z } from 'zod';

export const ScopedRoleAssignmentResponseSchema = z.object({
  id: z.string(),
  volunteerId: z.string(),
  volunteerName: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  scopeType: z.nativeEnum(RoleScope),
  rankLevel: z.nativeEnum(RankLevel).nullable(),
  denId: z.string().nullable(),
  denNumber: z.number().nullable(),
  assignedAt: z.string(),
});

export type ScopedRoleAssignmentResponseDto = z.infer<
  typeof ScopedRoleAssignmentResponseSchema
>;
