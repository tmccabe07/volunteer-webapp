/**
 * Points & Leaderboard Validation Schemas
 * 
 * Zod schemas for points-related API endpoints
 */

import { z } from 'zod';

/**
 * Revoke points validation
 * POST /api/points/revoke/:pointEventId
 */
export const revokePointsSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must not exceed 500 characters')
});

/**
 * List points query parameters
 * GET /api/points/me
 * GET /api/points/volunteers/:volunteerId
 */
export const listPointsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  year: z.coerce.number().int().min(2020).max(2100).optional()
});

/**
 * Leaderboard query parameters
 * GET /api/leaderboard
 */
export const leaderboardSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

/**
 * TypeScript types derived from schemas
 */
export type RevokePointsInput = z.infer<typeof revokePointsSchema>;
export type ListPointsQuery = z.infer<typeof listPointsSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardSchema>;
