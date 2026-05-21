/**
 * Zod Validation Schemas for Activity Slot Step API
 * 
 * Validates step creation, updates, and reordering
 * per contracts/activity-slot-api.md
 */

import { z } from 'zod';

/**
 * Schema for creating a new activity slot step
 * POST /api/activity-slots/:id/steps
 */
export const createActivitySlotStepSchema = z.object({
  stepText: z
    .string()
    .min(1, { message: 'Step text cannot be empty' })
    .max(200, { message: 'Step text cannot exceed 200 characters' })
    .transform(val => val.trim()),
});

export type CreateActivitySlotStepInput = z.infer<typeof createActivitySlotStepSchema>;

/**
 * Schema for updating an activity slot step
 * PATCH /api/activity-slots/:slotId/steps/:stepId
 */
export const updateActivitySlotStepSchema = z.object({
  stepText: z
    .string()
    .min(1, { message: 'Step text cannot be empty' })
    .max(200, { message: 'Step text cannot exceed 200 characters' })
    .transform(val => val.trim())
    .optional(),
});

export type UpdateActivitySlotStepInput = z.infer<typeof updateActivitySlotStepSchema>;

/**
 * Schema for reordering activity slot steps
 * PATCH /api/activity-slots/:id/steps/reorder
 */
export const reorderActivitySlotStepsSchema = z.object({
  stepIds: z
    .array(z.string())
    .min(1, { message: 'At least one step ID is required' })
    .max(20, { message: 'Cannot reorder more than 20 steps' }),
});

export type ReorderActivitySlotStepsInput = z.infer<typeof reorderActivitySlotStepsSchema>;

/**
 * Maximum number of steps allowed per activity slot
 */
export const MAX_STEPS_PER_ACTIVITY_SLOT = 20;
