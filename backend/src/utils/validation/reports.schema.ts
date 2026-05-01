import { z } from 'zod';

/**
 * Zod validation schemas for reporting endpoints
 * Feature: 001-volunteer-management - User Story 9
 */

/**
 * Validation schema for participation report query parameters
 * Endpoint: GET /api/reports/participation
 */
export const participationReportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  rankLevel: z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL', 'PACK_WIDE']).optional(),
  format: z.enum(['summary', 'detailed']).optional().default('summary')
}).refine(
  (data) => {
    // Validate that endDate is after startDate if both are provided
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  { message: 'endDate must be after startDate' }
);

/**
 * Validation schema for administrative task report query parameters
 * Endpoint: GET /api/reports/administrative-tasks
 */
export const adminTaskReportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['complete', 'incomplete', 'overdue']).optional(),
  taskId: z.string().cuid().optional(),
  format: z.enum(['summary', 'detailed']).optional().default('summary')
}).refine(
  (data) => {
    // Validate that endDate is after startDate if both are provided
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  { message: 'endDate must be after startDate' }
);

/**
 * Validation schema for upcoming events report query parameters
 * Endpoint: GET /api/reports/upcoming-events
 */
export const upcomingEventsReportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  rankLevel: z.enum(['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL', 'PACK_WIDE']).optional(),
}).refine(
  (data) => {
    // Validate that endDate is after startDate if both are provided
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  { message: 'endDate must be after startDate' }
);

// Type exports for use in controllers and services
export type ParticipationReportQuery = z.infer<typeof participationReportSchema>;
export type AdminTaskReportQuery = z.infer<typeof adminTaskReportSchema>;
export type UpcomingEventsReportQuery = z.infer<typeof upcomingEventsReportSchema>;
