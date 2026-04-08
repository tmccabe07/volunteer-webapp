import { z } from 'zod';

/**
 * Validation schema for user registration
 * Password requirements: min 8 chars, uppercase, lowercase, number, special character
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include uppercase letter')
    .regex(/[a-z]/, 'Password must include lowercase letter')
    .regex(/[0-9]/, 'Password must include number')
    .regex(/[^A-Za-z0-9]/, 'Password must include special character'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional()
});

/**
 * Validation schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Validation schema for password reset request
 */
export const requestResetSchema = z.object({
  email: z.string().email('Invalid email format')
});

/**
 * Validation schema for password reset with token
 * Token is 32 bytes in hex format (64 characters)
 */
export const resetPasswordSchema = z.object({
  token: z.string().length(64, 'Invalid reset token format'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include uppercase letter')
    .regex(/[a-z]/, 'Password must include lowercase letter')
    .regex(/[0-9]/, 'Password must include number')
    .regex(/[^A-Za-z0-9]/, 'Password must include special character')
});

/**
 * Validation schema for changing password (authenticated user)
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include uppercase letter')
    .regex(/[a-z]/, 'Password must include lowercase letter')
    .regex(/[0-9]/, 'Password must include number')
    .regex(/[^A-Za-z0-9]/, 'Password must include special character')
});

// Type exports for use in controllers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestResetInput = z.infer<typeof requestResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
