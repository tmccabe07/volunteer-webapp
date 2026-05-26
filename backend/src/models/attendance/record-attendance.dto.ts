import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

/**
 * Single attendance record for one child
 */
export const AttendanceRecordSchema = z.object({
  childScoutId: z
    .string()
    .min(1, 'Child scout ID is required'),
  
  attendanceStatus: z.nativeEnum(AttendanceStatus, {
    message: 'Invalid attendance status',
  }),
  
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .trim()
    .optional(),
  
  coveredRequirementIds: z
    .array(z.string())
    .optional()
    .default([]),
});

export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

/**
 * DTO for recording child attendance at an event
 * 
 * Authorization: LEADER with scope or ADMIN
 * Used by: PATCH /api/events/:id/child-attendance
 */
export const RecordAttendanceSchema = z.object({
  attendance: z
    .array(AttendanceRecordSchema)
    .min(1, 'At least one attendance record is required'),
});

export type RecordAttendanceDto = z.infer<typeof RecordAttendanceSchema>;
