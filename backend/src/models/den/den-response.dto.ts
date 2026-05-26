import { z } from 'zod';
import { RankLevel } from '@prisma/client';

/**
 * Response DTOs for den endpoints
 */

/**
 * Den list item for GET /dens
 */
export const DenListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  denNumber: z.number(),
  rankLevel: z.nativeEnum(RankLevel),
  isActive: z.boolean(),
  currentMemberCount: z.number(),
  leaders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
    }),
  ),
});

export type DenListItem = z.infer<typeof DenListItemSchema>;

/**
 * Den list response
 */
export const DenListResponseSchema = z.object({
  data: z.array(DenListItemSchema),
});

export type DenListResponse = z.infer<typeof DenListResponseSchema>;

/**
 * Create den response for POST /dens
 */
export const CreateDenResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  denNumber: z.number(),
  rankLevel: z.nativeEnum(RankLevel),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type CreateDenResponse = z.infer<typeof CreateDenResponseSchema>;

/**
 * Den roster member details
 */
export const DenRosterMemberSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  memberSince: z.string(),
  parents: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
      relationshipType: z.string(),
    }),
  ),
});

export type DenRosterMember = z.infer<typeof DenRosterMemberSchema>;

/**
 * Den roster response for GET /dens/:id/roster
 */
export const DenRosterResponseSchema = z.object({
  den: z.object({
    id: z.string(),
    name: z.string(),
    denNumber: z.number(),
    rankLevel: z.nativeEnum(RankLevel),
  }),
  members: z.array(DenRosterMemberSchema),
});

export type DenRosterResponse = z.infer<typeof DenRosterResponseSchema>;

/**
 * Den membership response for POST /dens/:id/members
 */
export const DenMembershipResponseSchema = z.object({
  id: z.string(),
  denId: z.string(),
  childScoutId: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  assignedBy: z.string(),
  reason: z.string().nullable(),
});

export type DenMembershipResponse = z.infer<typeof DenMembershipResponseSchema>;
