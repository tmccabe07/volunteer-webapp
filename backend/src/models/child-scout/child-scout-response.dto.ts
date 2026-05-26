import { z } from 'zod';
import { RankLevel, LinkStatus } from '@prisma/client';

/**
 * Response DTOs for child scout endpoints
 */

/**
 * Basic child scout info for list views
 */
export const ChildScoutListItemSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  currentRank: z.nativeEnum(RankLevel),
  isActive: z.boolean(),
  currentDen: z
    .object({
      id: z.string(),
      name: z.string(),
      denNumber: z.number(),
    })
    .nullable()
    .optional(),
});

export type ChildScoutListItem = z.infer<typeof ChildScoutListItemSchema>;

/**
 * Paginated list response for GET /child-scouts
 */
export const ChildScoutListResponseSchema = z.object({
  data: z.array(ChildScoutListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type ChildScoutListResponse = z.infer<typeof ChildScoutListResponseSchema>;

/**
 * Detailed child scout info for GET /child-scouts/:id
 */
export const ChildScoutDetailSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  currentRank: z.nativeEnum(RankLevel),
  isActive: z.boolean(),
  scoutbookId: z.string().nullable().optional(),
  currentDen: z
    .object({
      id: z.string(),
      name: z.string(),
      denNumber: z.number(),
      rankLevel: z.nativeEnum(RankLevel),
    })
    .nullable()
    .optional(),
  parentLinks: z.array(
    z.object({
      id: z.string(),
      parentName: z.string(),
      parentEmail: z.string(),
      relationshipType: z.string(),
      status: z.nativeEnum(LinkStatus),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChildScoutDetail = z.infer<typeof ChildScoutDetailSchema>;

/**
 * Response for POST /child-scouts
 */
export const CreateChildScoutResponseSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  currentRank: z.nativeEnum(RankLevel),
  isActive: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string(),
});

export type CreateChildScoutResponse = z.infer<typeof CreateChildScoutResponseSchema>;
