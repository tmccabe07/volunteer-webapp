import { z } from 'zod';

/**
 * Validation schemas for admin task management
 * Generated from contracts/admin-tasks-api.md
 */

// Completion step schema
export const completionStepSchema = z.object({
  step: z.string().min(1).max(500),
  url: z.string().url().optional(),
});

// Create admin task schema
export const createTaskSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  completionSteps: z.array(completionStepSchema).optional(),
  isPackWide: z.boolean().default(false),
  assignedRoleIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().default(false),
}).refine(
  (data) => {
    // If not pack-wide, assignedRoleIds must be provided
    if (!data.isPackWide && (!data.assignedRoleIds || data.assignedRoleIds.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'assignedRoleIds required when isPackWide is false',
    path: ['assignedRoleIds'],
  }
).refine(
  (data) => {
    // Validate dueDate is in the future
    const dueDate = new Date(data.dueDate);
    return dueDate > new Date();
  },
  {
    message: 'dueDate must be a future date',
    path: ['dueDate'],
  }
);

// Update admin task schema - all fields optional
export const updateTaskSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  completionSteps: z.array(completionStepSchema).optional(),
  isPackWide: z.boolean().optional(),
  assignedRoleIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
}).refine(
  (data) => {
    // If dueDate is provided, validate it's in the future
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      return dueDate > new Date();
    }
    return true;
  },
  {
    message: 'dueDate must be a future date',
    path: ['dueDate'],
  }
);

// List admin tasks query parameters schema
export const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  assignedToMe: z.string().transform(val => val === 'true').or(z.boolean()).optional(),
  status: z.enum(['complete', 'incomplete', 'overdue']).optional(),
  taskId: z.string().optional(),
});

// Complete task schema (no body needed)
export const completeTaskSchema = z.object({});

// Revoke task completion schema (optional, for future use)
export const revokeCompletionSchema = z.object({
  reason: z.string().min(3).max(500),
});

// Export TypeScript types inferred from schemas
export type CreateAdminTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateAdminTaskInput = z.infer<typeof updateTaskSchema>;
export type ListAdminTasksInput = z.infer<typeof listTasksSchema>;
