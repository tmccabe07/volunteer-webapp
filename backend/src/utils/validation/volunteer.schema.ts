import { z } from 'zod';

/**
 * Validation schemas for volunteer endpoints
 * Based on contracts/volunteers-api.md
 */

// Enum for valid rank levels (matches data-model.md)
export const RankLevelEnum = z.enum([
  'LION',
  'TIGER',
  'WOLF',
  'BEAR',
  'WEBELOS',
  'AOL',
]);

// Enum for valid auth tiers
export const AuthTierEnum = z.enum(['PARENT', 'LEADER', 'ADMIN']);

/**
 * PUT /api/volunteers/me/profile
 * Update volunteer profile
 */
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().nullable().optional(),
  leaderboardOptIn: z.boolean().optional(),
  childrenRanks: z.array(RankLevelEnum).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * POST /api/volunteers/me/roles
 * Assign role to volunteer
 */
export const assignRoleSchema = z.object({
  roleId: z.string().min(1),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

/**
 * GET /api/volunteers
 * List volunteers with filtering and pagination
 */
export const listVolunteersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  tier: AuthTierEnum.optional(),
  roleId: z.string().optional(),
});

export type ListVolunteersInput = z.infer<typeof listVolunteersSchema>;
