/**
 * Validation Utilities
 * 
 * Zod schema helpers for request validation
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone number validation (optional, flexible format)
export const phoneSchema = z
  .string()
  .regex(
    /^[\d\s\-\(\)\.]+$/,
    'Phone number can only contain digits, spaces, hyphens, parentheses, and periods'
  )
  .min(10, 'Phone number must be at least 10 characters')
  .optional();

// CUID validation
export const cuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID format');

// Date validation
export const dateSchema = z.coerce.date();

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Export all schema modules
export * from './activity.schema';
export * from './admin-task.schema';
export * from './auth.schema';
export * from './config.schema';
export * from './event.schema';
export * from './points.schema';
export * from './volunteer.schema';

/**
 * Enum helpers
 */

// Auth tier enum
export const authTierSchema = z.enum(['PARENT', 'LEADER', 'ADMIN']);

// Rank level enum
export const rankLevelSchema = z.enum([
  'LION',
  'TIGER',
  'WOLF',
  'BEAR',
  'WEBELOS',
  'AOL',
  'PACK_WIDE',
]);

// Role type enum
export const roleTypeSchema = z.enum(['PARENT', 'LEADER', 'ADMIN']);

// Activity category enum
export const activityCategorySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'SPECIAL',
]);

// Point event type enum
export const pointEventTypeSchema = z.enum([
  'ACTIVITY',
  'ROLE_BONUS',
  'MANUAL_AWARD',
  'REVOCATION',
]);

// Notification type enum
export const notificationTypeSchema = z.enum([
  'SIGNUP_CONFIRMATION',
  'EVENT_REMINDER',
  'POINTS_AWARDED',
  'ROLE_ASSIGNED',
  'BADGE_EARNED',
  'TASK_ASSIGNED',
  'GENERAL',
]);

/**
 * Helper to validate request body
 * 
 * @param schema Zod schema
 * @param data Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Helper to validate request body with safe parse
 * 
 * @param schema Zod schema
 * @param data Data to validate
 * @returns Success object with data or error object
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
) {
  return schema.safeParse(data);
}

/**
 * Middleware factory for request validation
 * 
 * @param schema Zod schema
 * @param source Request property to validate ('body', 'query', 'params')
 * @returns Express middleware function
 * 
 * @example
 * router.post('/register', validateRequest(registerSchema, 'body'), register);
 */
export function validateRequest(
  schema: z.ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: any, res: any, next: any) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      next(error);
    }
  };
}
