/**
 * Pack Configuration and Volunteer Role Validation Schemas
 * 
 * Zod validation schemas for User Story 8 - Pack and Role Configuration
 * Endpoint: /api/pack-config, /api/volunteer-roles
 */

import { z } from 'zod';

/**
 * Schema for updating pack configuration
 * PUT /api/pack-config
 */
export const updatePackConfigSchema = z.object({
  packName: z.string().min(1).max(100).optional(),
  packNumber: z.string().min(1).max(20).optional(),
  yearStartDate: z.string().datetime().optional(),
  yearEndDate: z.string().datetime().optional(),
  activeRanks: z.array(z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'])).optional()
}).refine(
  (data) => {
    // If both dates provided, yearStartDate must be before yearEndDate
    if (data.yearStartDate && data.yearEndDate) {
      return new Date(data.yearStartDate) < new Date(data.yearEndDate);
    }
    return true;
  },
  { message: 'yearStartDate must be before yearEndDate' }
);

export type UpdatePackConfigInput = z.infer<typeof updatePackConfigSchema>;

/**
 * Schema for creating a new volunteer role
 * POST /api/volunteer-roles
 */
export const createVolunteerRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  roleType: z.enum([
    'PARENT_GUARDIAN',
    'COMMITTEE',
    'DEN_LEADER',
    'ASSISTANT_DEN_LEADER',
    'ASSISTANT_CUB_MASTER',
    'LION_GUIDE',
    'SCOUTER_RESERVE'
  ]),
  specialty: z.string().optional(),
  rankLevel: z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL']).optional(),
  grantsTier: z.enum(['PARENT', 'LEADER', 'ADMIN']).optional()
}).refine(
  (data) => data.roleType !== 'COMMITTEE' || data.specialty,
  { message: 'COMMITTEE role type requires specialty' }
).refine(
  (data) => data.roleType !== 'DEN_LEADER' || data.rankLevel,
  { message: 'DEN_LEADER role type requires rankLevel' }
);

export type CreateVolunteerRoleInput = z.infer<typeof createVolunteerRoleSchema>;

/**
 * Schema for updating a volunteer role
 * PUT /api/volunteer-roles/:id
 */
export const updateVolunteerRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  roleType: z.enum(['PARENT_GUARDIAN', 'COMMITTEE', 'DEN_LEADER', 'ASSISTANT_DEN_LEADER', 'ASSISTANT_CUB_MASTER', 'LION_GUIDE', 'SCOUTER_RESERVE']).optional(),
  specialty: z.string().max(100).optional(),
  rankLevel: z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL']).optional(),
  grantsTier: z.enum(['PARENT', 'LEADER', 'ADMIN']).optional()
}).refine(
  (data) => {
    // If roleType is COMMITTEE, specialty should be provided
    if (data.roleType === 'COMMITTEE' && !data.specialty) {
      return false;
    }
    // If roleType is DEN_LEADER, rankLevel should be provided
    if (data.roleType === 'DEN_LEADER' && !data.rankLevel) {
      return false;
    }
    return true;
  },
  {
    message: 'Committee roles require specialty; Den Leader roles require rank level',
  }
);

export type UpdateVolunteerRoleInput = z.infer<typeof updateVolunteerRoleSchema>;
