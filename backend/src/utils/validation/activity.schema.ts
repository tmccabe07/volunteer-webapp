import { z } from 'zod';

/**
 * Activity category enum with point value ranges
 * LOW: 1-5 points, MEDIUM: 6-10 points, HIGH: 11-20 points, SPECIAL: custom
 */
export const activityCategoryEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'SPECIAL']);

/**
 * Validation schema for creating a new activity type
 */
export const createActivitySchema = z.object({
  name: z.string()
    .min(1, 'Activity name is required')
    .max(100, 'Activity name must be 100 characters or less'),
  pointValue: z.number()
    .int('Point value must be an integer')
    .positive('Point value must be positive'),
  category: activityCategoryEnum,
  description: z.string().max(500, 'Description must be 500 characters or less').optional()
}).refine(
  (data) => {
    // Validate point value matches category ranges
    if (data.category === 'LOW' && (data.pointValue < 1 || data.pointValue > 5)) {
      return false;
    }
    if (data.category === 'MEDIUM' && (data.pointValue < 6 || data.pointValue > 10)) {
      return false;
    }
    if (data.category === 'HIGH' && (data.pointValue < 11 || data.pointValue > 20)) {
      return false;
    }
    // SPECIAL category has no restrictions
    return true;
  },
  {
    message: 'Point value must match category range: LOW (1-5), MEDIUM (6-10), HIGH (11-20), SPECIAL (any positive)',
    path: ['pointValue']
  }
);

/**
 * Validation schema for updating an activity type
 * All fields are optional
 */
export const updateActivitySchema = z.object({
  name: z.string()
    .min(1, 'Activity name is required')
    .max(100, 'Activity name must be 100 characters or less')
    .optional(),
  pointValue: z.number()
    .int('Point value must be an integer')
    .positive('Point value must be positive')
    .optional(),
  category: activityCategoryEnum.optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').nullable().optional()
}).refine(
  (data) => {
    // If both pointValue and category are provided, validate they match
    if (data.pointValue !== undefined && data.category !== undefined) {
      if (data.category === 'LOW' && (data.pointValue < 1 || data.pointValue > 5)) {
        return false;
      }
      if (data.category === 'MEDIUM' && (data.pointValue < 6 || data.pointValue > 10)) {
        return false;
      }
      if (data.category === 'HIGH' && (data.pointValue < 11 || data.pointValue > 20)) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Point value must match category range: LOW (1-5), MEDIUM (6-10), HIGH (11-20), SPECIAL (any positive)',
    path: ['pointValue']
  }
);

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
